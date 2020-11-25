const puppeteer = require('puppeteer');
const webPageCreator = require('./create-web-page')




async function process() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // await page.goto('https://en.wikipedia.org/wiki/Coronavirus');
  await page.setViewport({
    width: 1000,
    height: 600,
  });
  await page.goto('https://en.wikipedia.org/wiki/Goods_and_services', {waitUntil: 'networkidle2'});
  await page.addScriptTag({ path: './helper-functions.js' });
  await page.addScriptTag({path: './traverse.js'});


  const returned = await page.evaluate(async () => {
    traverse(document);


    var body = document.body,
    html = document.documentElement;

    var height = Math.max( body.scrollHeight, body.offsetHeight, 
                       html.clientHeight, html.scrollHeight, html.offsetHeight );
   

    return {elements:elements, document:{ 
      documentBody:{height:document.body.clientHeight, width:document.body.clientWidth}, 
      documentBodyScroll:{height: document.body.scrollHeight, width:document.body.scrollWidth      }
    } };



  });

  // await page.screenshot({
  //   path: 'webpage.png',
  //   clip: {
  //     x: 0,
  //     y: 0,
  //     width,
  //     height
  //   },
  //   type: 'png'
  // });

  // await page.screenshot({path: 'webpage.png', fullPage: true});
  
  await browser.close();
  return returned;
}

function main(data){
  webPageCreator.runServer(data);
}

process().then(returned => {console.log(returned.document); main(returned.elements)});


