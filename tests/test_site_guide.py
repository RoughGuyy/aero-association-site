"""Contract checks for the public-site guide and its HTTP boundary."""
import io
import json
import threading
import unittest
from http.server import ThreadingHTTPServer
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from aero_association_agent import site_guide as g


class GuideTests(unittest.TestCase):
    def test_catalog_is_public_and_uses_page_entrances(self):
        entries = g.catalog()
        self.assertEqual(len(entries), len({x['id'] for x in entries}))
        self.assertTrue(any(x['href'] == '?article=3d-printing' for x in entries))
        self.assertTrue(all('#' not in x['href'] or x['href'].startswith('?page=resources#') for x in entries))
        self.assertTrue(any(x['href'] == '?article=battery-charging' for x in entries))
        self.assertFalse(any('safety-rules' in x['href'] for x in entries))
        self.assertTrue(all(x['href'].startswith('?') for x in entries))

    def test_model_cannot_supply_its_own_destination_or_duplicate_results(self):
        entries = [{'id': 'equipment-flow', 'title': '设备取用', 'summary': '借用登记说明', 'href': '?article=equipment-flow'}, {'id': 'alias', 'title': '别名', 'href': '?article=equipment-flow'}]
        result = g.validate_reply({'message': '先看这里', 'matches': [
            {'id': 'made-up', 'href': 'https://bad.example'},
            {'id': 'equipment-flow', 'href': 'https://bad.example', 'reason': '登记'},
            {'id': 'alias'}, {'id': 'equipment-flow#借用怎么登记'}, {'id': 'equipment-flow'}]}, entries)
        self.assertEqual(result['matches'], [{'title': '设备取用', 'href': '?article=equipment-flow', 'reason': '借用登记说明'}])
        self.assertFalse(g.validate_reply({'matches': []}, entries)['matches'])

    def test_broad_beginner_intent_is_pinned_but_specific_questions_are_not(self):
        entries = g.catalog()
        for question in ['固定翼怎么入门', '固定翼怎么入门？', '零基础想学固定翼', '固定翼']:
            self.assertEqual(g.pinned_reply(question, entries)['matches'][0]['href'], '?article=fixed-wing-path')
        self.assertIsNone(g.pinned_reply('固定翼凤凰模拟器怎么安装', entries))
        with patch.object(g, 'urlopen') as call:
            self.assertEqual(g.guide('固定翼怎么入门')['matches'][0]['title'], '固定翼入门')
            call.assert_not_called()

    def test_missing_key_does_not_attempt_provider_request(self):
        with patch.dict(g.os.environ, {}, clear=True), patch.object(g, 'load_environment'), patch.object(g, 'urlopen') as call:
            with self.assertRaises(g.GuideError):
                g.guide('怎么借遥控器')
            call.assert_not_called()

    def test_provider_contract_and_error_redaction(self):
        response = io.BytesIO(json.dumps({'choices': [{'message': {'content': json.dumps({'matches': [{'id': 'x'}]})}}]}).encode())
        with patch.object(g, 'configuration', return_value=('test-secret', 'deepseek-flash')), patch.object(g, 'catalog', return_value=[{'id':'x','title':'X','href':'?article=x'}]), patch.object(g, 'urlopen', return_value=response) as call:
            self.assertEqual(g.guide('找资料')['matches'][0]['href'], '?article=x')
            request = call.call_args.args[0]
            self.assertEqual(request.full_url, 'https://api.deepseek.com/chat/completions')
            payload = json.loads(request.data)
            self.assertEqual(payload['response_format']['type'], 'json_object')
            self.assertNotIn('test-secret', request.data.decode())
        with patch.object(g, 'configuration', return_value=('test-secret', 'deepseek-flash')), patch.object(g, 'urlopen', side_effect=HTTPError('url', 401, 'test-secret', {}, None)):
            with self.assertRaises(g.GuideError) as error:
                g.guide('找资料')
            self.assertNotIn('test-secret', str(error.exception))

    def test_http_rejects_foreign_origin_and_invalid_input(self):
        class QuietHandler(g.GuideHandler):
            def log_message(self, *args):
                pass
        server = ThreadingHTTPServer(('127.0.0.1', 0), QuietHandler)
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            endpoint = f'http://127.0.0.1:{server.server_port}/api/guide'
            for origin, body, status in [('https://bad.example', {'question':'你好'}, 403), ('http://127.0.0.1:8000', {'question':' '}, 400)]:
                req = Request(endpoint, data=json.dumps(body).encode(), headers={'Origin':origin,'Content-Type':'application/json'})
                with self.assertRaises(HTTPError) as error:
                    urlopen(req)
                self.assertEqual(error.exception.code, status)
            with patch.object(g, 'guide', return_value={'message':'找到资料','matches':[]}) as call:
                req = Request(endpoint, data=json.dumps({'question':'借设备'}).encode(), headers={'Origin':'http://127.0.0.1:8000','Content-Type':'application/json'})
                with urlopen(req) as response:
                    self.assertEqual(response.status, 200)
                    self.assertEqual(response.headers['Access-Control-Allow-Origin'], 'http://127.0.0.1:8000')
                call.assert_called_once_with('借设备')
        finally:
            server.shutdown()
            server.server_close()
            g.CALLS.clear()

if __name__ == '__main__':
    unittest.main()
