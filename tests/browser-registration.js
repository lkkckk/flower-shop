async (page) => {
  const origin = await page.evaluate(() => location.origin);
  const image = async (color, width, height) => {
    await page.evaluate(({color,width,height}) => {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = color; ctx.fillRect(0,0,width,height);
    ctx.fillStyle = 'white'; ctx.font = '60px sans-serif'; ctx.fillText(width+' × '+height,40,100);
    canvas.id = 'acceptance-image';
    canvas.style.cssText = 'position:absolute;left:0;top:0;z-index:99999';
    document.body.appendChild(canvas);
    }, {color,width,height});
    const buffer = await page.locator('#acceptance-image').screenshot();
    await page.locator('#acceptance-image').evaluate(el => el.remove());
    return buffer;
  };
  const blue = {name:'blue.png',mimeType:'image/png',buffer:await image('#176ca4',1000,500)};
  const red = {name:'red.png',mimeType:'image/png',buffer:await image('#ad3754',700,1000)};
  const check = (value, message) => { if (!value) throw new Error(message); };
  await page.getByPlaceholder('手工填写订单编号（允许重复）').fill('浏览器验收-照片关联');
  await page.getByPlaceholder('例如：碎冰蓝玫瑰11枝花束').fill('待删除商品甲');
  await page.getByPlaceholder('268.00').fill('268.00');
  await page.getByRole('button',{name:'添加商品'}).click();
  await page.getByPlaceholder('例如：碎冰蓝玫瑰11枝花束').nth(1).fill('保留商品乙');
  await page.getByPlaceholder('268.00').nth(1).fill('128.50');
  let response = page.waitForResponse(r=>r.url().endsWith('/api/preorder-registrations/images'));
  await page.locator('.item-card').nth(1).locator('input[type=file]').first().setInputFiles(blue);
  const blueUrl = (await (await response).json()).data.imageUrl;
  await page.waitForFunction(()=>!document.querySelector('.registration-form')?.textContent.includes('上传中...'));
  // Delete a preceding item while its upload is in flight. Its late response must not overwrite the remaining item.
  let release; let received;
  const gate = new Promise(resolve=>{release=resolve});
  const seen = new Promise(resolve=>{received=resolve});
  await page.route('**/api/preorder-registrations/images',async route=>{received();await gate;await route.continue();},{times:1});
  response = page.waitForResponse(r=>r.url().endsWith('/api/preorder-registrations/images'));
  await page.locator('.item-card').first().locator('input[type=file]').first().setInputFiles(red);
  await seen;
  await page.getByRole('button',{name:'删除商品'}).first().click();
  release(); await response;
  check(await page.locator('.item-card').count()===1,'删除商品未生效');
  // Move a completed image across an in-flight image, then let that upload finish.
  let release2; let received2;
  const gate2 = new Promise(resolve=>{release2=resolve}); const seen2=new Promise(resolve=>{received2=resolve});
  await page.route('**/api/preorder-registrations/images',async route=>{received2();await gate2;await route.continue();},{times:1});
  response = page.waitForResponse(r=>r.url().endsWith('/api/preorder-registrations/images'));
  await page.locator('input[type=file]').first().setInputFiles(red); await seen2;
  await page.locator('.photo-box').first().hover();
  await page.getByTitle('后移',{exact:true}).click(); release2();
  const redUrl=(await (await response).json()).data.imageUrl;
  await page.waitForFunction(()=>!document.querySelector('.registration-form')?.textContent.includes('上传中...'));
  // Retry one failed upload, without reselecting the file.
  await page.route('**/api/preorder-registrations/images',route=>route.abort(),{times:1});
  await page.locator('input[type=file]').first().setInputFiles(blue);
  await page.getByRole('button',{name:'重试',exact:true}).waitFor();
  check(await page.getByRole('button',{name:'保存登记',exact:true}).isDisabled(),'失败照片没有阻止保存');
  response=page.waitForResponse(r=>r.url().endsWith('/api/preorder-registrations/images'));
  await page.getByRole('button',{name:'重试',exact:true}).click(); await response;
  await page.waitForFunction(()=>!document.querySelector('.registration-form')?.textContent.includes('上传中...'));
  check(await page.getByRole('button',{name:'保存登记',exact:true}).isEnabled(),'照片完成后保存仍被禁用');
  await page.locator('.ant-message-notice').waitFor({state:'hidden'});
  for(const [width,height] of [[375,812],[768,1024],[1024,768],[1440,900]]) {
    await page.setViewportSize({width,height});
    await page.waitForFunction(expected => getComputedStyle(document.querySelector('.admin-main')).marginLeft === expected, width < 1024 ? '0px' : '240px');
    const saveBox = await page.getByRole('button',{name:'保存登记',exact:true}).boundingBox();
    check(saveBox && saveBox.x >= 0 && saveBox.x + saveBox.width <= width,'保存按钮超出屏幕 '+width);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
    check(!overflow,'表单横向溢出 '+width);
    await page.screenshot({path:`output/playwright/registration-form-${width}.png`,fullPage:true,animations:'disabled'});
  }
  const savedResponse=page.waitForResponse(r=>r.url().endsWith('/api/preorder-registrations')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'保存登记',exact:true}).click();
  const saved=(await (await savedResponse).json()).data;
  check(saved.items.length===1&&saved.items[0].name==='保留商品乙','商品关联错误');
  check(saved.items[0].photos[0].url===redUrl && saved.items[0].photos[1].url===blueUrl,'上传回调覆盖了其他照片');
  check(saved.items[0].photos.length===3,'照片丢失');
  await page.waitForURL(`**/preorders/registrations/${saved.id}`);
  await page.goto(`${origin}/preorders/registrations/${saved.id}/delivery-slip`);
  await page.getByRole('button',{name:'立即打印配送单'}).waitFor();
  await page.waitForFunction(()=>[...document.querySelectorAll('button')].some(b=>b.textContent.includes('立即打印配送单')&&!b.disabled));
  await page.screenshot({path:'output/playwright/delivery-slip.png',fullPage:true});
  await page.pdf({path:'output/playwright/delivery-slip.pdf',format:'A4',printBackground:true,preferCSSPageSize:true});
  console.log(JSON.stringify({status:'passed',registrationId:saved.id,checks:['delete during upload','reorder during upload','retry','375/768/1024/1440 form','saved photo mapping','print images ready','A4 PDF']}));
}
