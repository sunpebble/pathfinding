## ADDED Requirements

### Requirement: TextField Focus State Visual Feedback

TextField SHALL 在获得焦点时显示明确的视觉反馈。

#### Scenario: Focused TextField shows accent border

- **WHEN** TextField 获得输入焦点
- **THEN** TextField SHALL 显示 accent 色边框（2pt 宽度）
- **THEN** 边框过渡 SHALL 使用 DesignTokens.Animation.quick 动画

#### Scenario: Unfocused TextField shows default border

- **WHEN** TextField 失去焦点
- **THEN** TextField SHALL 恢复为默认边框样式（1pt，systemGray4 色）

### Requirement: Form Validation Feedback

表单 SHALL 在用户输入时提供实时验证反馈。

#### Scenario: Required field empty warning

- **WHEN** 必填字段为空且用户尝试提交
- **THEN** 系统 SHALL 在字段下方显示红色提示文字
- **THEN** 字段边框 SHALL 变为红色

#### Scenario: Date range validation

- **WHEN** 用户在创建行程时选择结束日期早于开始日期
- **THEN** 系统 SHALL 立即显示"结束日期不能早于开始日期"提示
- **THEN** "创建"按钮 SHALL 保持禁用状态

#### Scenario: Valid input positive feedback

- **WHEN** 用户输入通过验证
- **THEN** 字段 SHALL 恢复正常边框样式（无红色）

### Requirement: Character Count Indicator

有长度限制的文本输入 SHALL 显示字符计数。

#### Scenario: Title field shows remaining characters

- **WHEN** 标题输入框有最大字符限制
- **THEN** 输入框右下角 SHALL 显示"当前/最大"字符数
- **THEN** 接近限制时（>90%）数字 SHALL 变为 warning 色

#### Scenario: Character limit reached

- **WHEN** 输入达到最大字符数
- **THEN** 计数器 SHALL 变为 error 色
- **THEN** 系统 SHALL 阻止继续输入

### Requirement: Form Submit Button State

表单提交按钮 SHALL 反映表单的验证状态。

#### Scenario: Button disabled when form invalid

- **WHEN** 表单存在验证错误或必填字段为空
- **THEN** 提交按钮 SHALL 处于禁用状态（灰色，不可点击）

#### Scenario: Button enabled when form valid

- **WHEN** 所有必填字段已填写且验证通过
- **THEN** 提交按钮 SHALL 处于启用状态（accent 色）

#### Scenario: Button shows loading during submission

- **WHEN** 用户点击提交按钮
- **THEN** 按钮 SHALL 显示 ProgressView 并禁用重复点击
