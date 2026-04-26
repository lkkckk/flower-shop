const { Tag: ExtraTag, TablePage: ExtraTablePage } = window;

function InboundPage() {
  return <ExtraTablePage title="入库登记" sub="录入花材到货批次、成本和保鲜期。" action="保存入库" columns={["商品", "批次", "数量", "进价", "到期日"]} rows={[["昆明玫瑰", "B20260426001", "120 枝", "¥3.20", "04-29"], ["白色百合", "B20260426002", "80 枝", "¥8.00", "05-02"]]} />;
}

function PreorderDetailPage() {
  return <ExtraTablePage title="预售单详情" sub="查看履约信息、商品明细和客户备注。" action="打印配送单" columns={["字段", "内容"]} rows={[["单号", "PU2026042500001"], ["收花人", "李娜"], ["履约时间", "2026-04-28 23:59"], ["状态", <ExtraTag tone="amber">待确认</ExtraTag>]]} />;
}

function CustomerDetailPage() {
  return <ExtraTablePage title="客户详情" sub="消费记录、预存余额、欠款和常购商品。" action="收款" columns={["项目", "数值"]} rows={[["姓名", "李娜"], ["等级", <ExtraTag tone="olive">VIP</ExtraTag>], ["账户余额", "¥560.00"], ["累计消费", "¥8,420.00"]]} />;
}

function StocktakePage() {
  return <ExtraTablePage title="库存盘点" sub="核对当前库存并生成调整流水。" action="提交盘点" columns={["商品", "账面", "实盘", "差异"]} rows={[["红玫瑰", "96", "94", "-2"], ["白百合", "73", "73", "0"]]} />;
}

function MovementsPage() {
  return <ExtraTablePage title="库存流水" sub="追踪入库、销售、报损和盘点调整。" action="导出" columns={["时间", "商品", "类型", "数量"]} rows={[["09:30", "红玫瑰", "销售", "-12"], ["10:20", "白百合", "入库", "+80"]]} />;
}

function RestockPage() {
  return <ExtraTablePage title="采购建议" sub="根据销量、库存和临期情况生成补货建议。" action="生成建议" columns={["商品", "当前库存", "建议补货", "原因"]} rows={[["红玫瑰", "96", "60", "近 7 天畅销"], ["尤加利叶", "48", "30", "低于安全库存"]]} />;
}

function PricingPage() {
  return <ExtraTablePage title="价格策略" sub="维护会员价、批发价和满减活动。" action="新增策略" columns={["商品", "零售价", "会员价", "批发价"]} rows={[["红玫瑰花束", "¥168", "¥158", "¥138"], ["向日葵小束", "¥88", "¥82", "¥72"]]} />;
}

Object.assign(window, { InboundPage, PreorderDetailPage, CustomerDetailPage, StocktakePage, MovementsPage, RestockPage, PricingPage });
