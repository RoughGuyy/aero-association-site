"""Contracts between visible navigation, public content and guide destinations."""
import json
import unittest
from unittest.mock import patch

from aero_association_agent import site_guide
from aero_association_agent.site_structure import load_structure, navigation_index
from aero_association_agent.content_loader import load_public_content


class StructureTests(unittest.TestCase):
    def test_tree_owns_articles_and_preserves_public_records(self):
        index = navigation_index()
        entries = {entry['id']: entry for entry in index['entries']}
        self.assertEqual(len(entries), len(index['entries']))
        self.assertEqual(entries['fixed-wing-simulator']['ancestors'], ['newcomer-path', 'fixed-wing-path'])
        self.assertIn('aerobatics-training', entries['flight-loop-roll']['ancestors'])
        self.assertEqual(entries['design-making']['title'], '焊台与热风枪使用注意事项')
        self.assertNotIn('outreach-service', entries)
        self.assertNotIn('下级文章', entries['fixed-wing-path']['summary'])
        self.assertEqual(len(load_public_content('news')), 14)
        self.assertEqual(len([e for e in entries if e.startswith('news/')]), 14)
        self.assertNotIn('topics', json.dumps(index['tree']))

    def test_parent_child_and_same_page_groups_are_not_returned_together(self):
        entries = navigation_index()['entries']
        result = site_guide.validate_reply({'matches': [{'id': 'newcomer-path'}, {'id': 'fixed-wing-path'}]}, entries)
        self.assertEqual([r['href'] for r in result['matches']], ['?article=fixed-wing-path'])
        result = site_guide.validate_reply({'matches': [{'id': 'resource-center'}, {'id': 'design-making-group'}, {'id': 'radio-electronics-group'}]}, entries)
        self.assertEqual(len(result['matches']), 1)
        self.assertEqual(result['matches'][0]['href'], '?page=resources#design-making')

    def test_missing_duplicate_or_unplaced_content_fails_validation(self):
        for change in ('missing', 'duplicate', 'unplaced'):
            structure = load_structure()
            if change == 'missing':
                structure['pages'][0]['article'] = 'missing-article'
            elif change == 'duplicate':
                structure['pages'].append(structure['pages'][0])
            else:
                structure['pages'][1]['children'].pop()
            with self.subTest(change=change), patch('aero_association_agent.site_structure.load_structure', return_value=structure):
                with self.assertRaises(ValueError):
                    navigation_index()

    def test_member_awards_keep_their_correct_projects_and_competition_levels(self):
        records = {item.id: item for item in load_public_content('projects')}
        expected = {
            '2026-qiu-net': ('明晨智', '特等奖', '四川省'),
            '2026-dingkongying': ('傅靖涵', '令狐煊烨', '校选拔赛二等奖'),
            '2026-taiqingying': ('何林芳', '太轻影', '校选拔赛二等奖'),
            '2026-taiyifeng': ('何林芳', '谢雨荷', '四川省大学生创业计划竞赛二等奖'),
            '2026-taihezhigang': ('何林芳', '校内选拔赛铜奖'),
            '2026-qianjiyin': ('谢雨荷', '傅靖涵', '令狐煊烨', '本科生创意组第一', '季军', '校内选拔赛'),
            '2025-zhikongquan': ('周京明', '第十九届', '三等奖'),
        }
        for identifier, terms in expected.items():
            self.assertIn(identifier, records)
            for term in terms:
                self.assertIn(term, records[identifier].summary + '\n' + records[identifier].body)
        index_ids = {entry['id'] for entry in navigation_index()['entries']}
        self.assertTrue(all('projects/' + identifier in index_ids for identifier in expected))

    def test_ablefly_photo_belongs_to_its_own_competition(self):
        from aero_association_agent.article_loader import get_article
        body = get_article('competitions-and-growth').body
        ablefly = body.index('## Ablefly 无人机足球')
        photo = body.index('/assets/drone-soccer-final-team.jpg')
        general = body.index('## 相关学科竞赛')
        self.assertLess(ablefly, photo)
        self.assertLess(photo, general)
        self.assertEqual(body.count('/assets/drone-soccer-final-team.jpg'), 1)
