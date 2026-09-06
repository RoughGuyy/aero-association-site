---
id: opentx-logic
title: OpenTX 基本逻辑：Input、Mixer、Output
section: 技术资料
subsection: 遥控器与航电
order: 230
summary: 用一张图解释 OpenTX 从摇杆输入到通道输出的基本流程。
tags: [OpenTX, TX12, Input, Mixer, Output, Flight Mode, 混控]
source_refs: [opentx逻辑结构图（老猪整理版）v1.1.pdf, RadioMaster TX12 中文说明书  v1.0.pdf]
---

# OpenTX 基本逻辑：Input、Mixer、Output

OpenTX 中，摇杆和开关信号经过输入设置、混控和输出设置，最终传给接收机、模拟器或飞控。排查通道问题时，可以按这几部分逐项检查。

## 输入、混控与输出

1. **Input**：把物理摇杆、旋钮、开关变成输入信号。
2. **Mixer**：把输入信号组合、加权、混控，决定每个通道该输出什么。
3. **Output**：把通道结果发给接收机或模拟器。

Flight Mode 和全局变量可以改变不同模式下的混控、曲线和输出。

![OpenTX 逻辑结构图](/knowledge/assets/images/opentx逻辑结构图-老猪整理版-v1.1_01/opentx逻辑结构图（老猪整理版）v1.1_01.png)

## 用魔翼 90 举例

以固定翼为例，你动右手横向摇杆时，事情大致是这样发生的：

1. 摇杆动作先进入 Input。
2. Input 可以加曲线，让中位附近更柔和。
3. Mixer 把这个输入分配给副翼通道。
4. Output 决定这个通道最终方向、行程和限位。
5. 接收机把通道信号传给舵机，带动舵面。

## 常见现象

如果你遇到“杆量有反应，但舵面不对”，问题可能不在摇杆，而在 Mixer 或 Output。

如果你遇到“模拟器通道反了”，可能是模拟器配置、Input、Output 或通道映射中的某一层反了。

如果你遇到“这个模型能用，那个模型不能用”，往往是模型配置不同，而不是遥控器坏了。

## 排查顺序

排查时先卸下螺旋桨，再依次确认：

1. 当前模型是否选对。
2. Input 页面有没有输入反应。
3. Mixer 里对应通道有没有混控。
4. Output 里方向、限位、中点是否合理。
5. 接收机、模拟器或飞控端是否还做了额外映射。

## 其他设置

全局变量、Flight Mode、Lua 脚本和协议设置可在需要时继续查阅说明书。入门阶段先熟悉当前模型的输入、混控和输出。
