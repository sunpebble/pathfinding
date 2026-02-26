## Why

iOS App 在展示旅游攻略(travelGuides)时，部分关键字段可能为空或缺失，导致 UI 显示异常（空白区域、占位符、崩溃）。需要确保所有用于展示的字段都有合理的默认值或必填保证，提升用户体验的一致性。

## What Changes

- 添加数据完整性检查，识别缺失关键展示字段的记录
- 为缺失字段生成合理的默认值或从现有数据推断
- 添加数据修复迁移脚本，批量补全历史数据
- 增强 upsert 逻辑，确保新数据入库时展示字段完整
- 添加 API 层的字段保证，返回给客户端前确保字段非空

## Capabilities

### New Capabilities

- `ios-display-fields`: 定义 iOS App 展示所需的必填字段清单，提供字段完整性验证和自动补全逻辑

### Modified Capabilities

- `data-validation`: 扩展验证规则，增加 iOS 展示字段的必填检查

## Impact

- **convex/travelGuides.ts**: 修改 upsert 逻辑，添加字段补全
- **convex/schema.ts**: 可能调整部分字段的可选性定义
- **packages/crawler-types**: 更新验证器，增加展示字段检查
- **iOS App API 消费者**: 可依赖字段非空保证，简化客户端逻辑
