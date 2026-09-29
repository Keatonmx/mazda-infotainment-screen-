const fs=require('fs');
const src=fs.readFileSync(__dirname + '/../apps/app.roadtrip/app.js','utf8');
eval(fs.readFileSync(__dirname + '/../apps/app.roadtrip/states.js','utf8').replace(/var /g,'global.'));
let app; global.CustomApplicationsHandler={register:(i,a)=>app=a}; global.CustomApplication=function(d){Object.assign(this,d)};
eval(src);
const T=[[47.38,-122.23,'WA'],[45.62,-122.67,'WA'],[45.52,-122.68,'OR'],[39.10,-94.58,'MO'],[39.09,-94.63,'KS'],[38.90,-77.04,'DC'],[40.71,-74.0,'NY'],[40.72,-74.07,'NJ'],[21.31,-157.86,'HI'],[61.22,-149.9,'AK'],[64.84,-147.72,'AK'],[41.26,-95.86,'IA'],[41.26,-95.94,'NE'],[38.62,-90.15,'IL'],[38.63,-90.2,'MO'],[39.10,-84.51,'OH'],[39.08,-84.51,'KY'],[39.93,-75.12,'NJ'],[39.95,-75.17,'PA'],[46.79,-92.1,'MN'],[46.72,-92.1,'WI'],[46.42,-117.02,'ID'],[46.42,-117.05,'WA'],[46.87,-96.77,'MN'],[46.88,-96.79,'ND'],[42.36,-71.06,'MA'],[25.76,-80.19,'FL'],[32.72,-117.16,'CA'],[36.17,-115.14,'NV'],[29.95,-90.07,'LA'],[30.27,-97.74,'TX'],[44.98,-93.27,'MN'],[49.28,-123.12,null],[19.43,-99.13,null],[32.52,-117.03,null]];
const bad=T.filter(([la,lo,e])=>{app.current=null;const s=app.locate(lo,la);return (s?s.a:null)!==e;});
console.log('ok',T.length-bad.length,'/',T.length,JSON.stringify(bad));
