async page => {
  const modal=page.getByRole('dialog',{name:'本机打印设置'});
  if(!await modal.getByRole('radio',{name:'浏览器打印',exact:true}).isChecked() || !await modal.getByRole('radio',{name:'58mm',exact:true}).isChecked())throw new Error('损坏设置没有恢复默认');
  let settingsWrites=0;
  const listener=r=>{if(r.url().endsWith('/api/settings')&&r.method()!=='GET')settingsWrites++};
  page.on('request',listener);
  await modal.getByRole('radio',{name:'80mm',exact:true}).check();
  await modal.getByRole('spinbutton').fill('2');
  for(const width of [375,768,1440]){
    await page.setViewportSize({width,height:900});
    const box=await modal.boundingBox();
    if(!box||box.x<0||box.x+box.width>width+1)throw new Error('设置弹窗超出视口');
    await page.screenshot({path:`output/playwright/printer-settings-${width}.png`,fullPage:true});
  }
  await modal.getByRole('button',{name:'确 定',exact:true}).click();
  await page.reload();
  await page.locator('.pos-order-toolbar button').filter({hasText:'打印设置'}).click();
  if(!await modal.getByRole('radio',{name:'80mm',exact:true}).isChecked()||await modal.getByRole('spinbutton').inputValue()!=='2')throw new Error('设置未保存');
  await modal.getByRole('button',{name:'测试打印',exact:true}).click();
  await page.frameLocator('iframe[aria-hidden=true]').locator('.receipt').nth(1).waitFor();
  if(settingsWrites!==0)throw new Error('本机设置错误写入全店设置');
  await modal.getByRole('button',{name:'取 消',exact:true}).click();
  page.off('request',listener);
  console.log('PASS 本机设置损坏恢复、手机/平板弹窗、保存重载、2份浏览器测试打印、全店设置零写入');
}
