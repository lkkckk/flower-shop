async page => {
  let checkouts=0, nativePrints=0, savedId;
  const requests=request=>{if(request.url().endsWith('/api/orders/checkout')&&request.method()==='POST')checkouts++};
  page.on('request',requests);
  await page.exposeFunction('recordAcceptancePrint',()=>{nativePrints++});
  await page.addInitScript(()=>{window.print=()=>window.recordAcceptancePrint()});
  const response=page.waitForResponse(r=>r.url().endsWith('/api/orders/checkout')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'确认收款',exact:true}).click();
  const result=await (await response).json(); savedId=result.data.order.id;
  await page.getByText(/订单已保存，打印未完成/).waitFor({timeout:45000});
  if(checkouts!==1)throw new Error('打印失败重复提交了结账');
  await page.getByRole('button',{name:'打印 / 重打小票',exact:true}).click();
  await page.getByText(/订单已保存，打印未完成/).waitFor({timeout:45000});
  if(checkouts!==1)throw new Error('重打重复结账');
  await page.getByRole('button',{name:'改用浏览器打印',exact:true}).click();
  await page.getByText('已打开浏览器打印窗口，请确认打印。',{exact:true}).waitFor();
  if(nativePrints!==1||checkouts!==1)throw new Error('浏览器替代重复结账或未调用打印');
  await page.screenshot({path:'output/playwright/pos-print-fallback.png',fullPage:true});
  await page.getByRole('button',{name:'继续开单',exact:true}).click();
  await page.getByText('购物车为空，请先选择商品',{exact:true}).waitFor();
  const persisted=await page.evaluate(async id=>{
    const token=decodeURIComponent(document.cookie.split('; ').find(c=>c.startsWith('auth_token=')).slice(11));
    return (await (await fetch('/api/orders/'+id,{headers:{Authorization:'Bearer '+token}})).json()).data;
  },savedId);
  if(persisted.id!==savedId||String(persisted.totalAmount)!=='20.00')throw new Error('打印失败影响已保存订单');
  page.off('request',requests);
  console.log(JSON.stringify({status:'passed',savedId,checkouts,nativePrints,checks:['真实QZ服务不可用','自动打印失败订单仍保存','重打不结账','明确浏览器替代','继续开单']}));
}
