import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{l as t,n}from"./iframe-CvjSoj0j.js";var r,i,a,o,s,c,l;function u(){return(u=e((()=>{n(),r=Date.UTC(2026,0,15,17),i={title:`Time/On-time indicator`,component:t,args:{scheduled:r,estimated:r},parameters:{docs:{description:{component:`Compares supplied epoch-millisecond timestamps. Examples use a fixed clock, not a live feed.`}}}},a={},o={args:{estimated:r-12e4}},s={args:{estimated:r+18e4}},c={args:{estimated:0}},l=[`OnTime`,`Early`,`Late`,`MissingEstimate`],a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{}`,...a.parameters?.docs?.source}}},o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    estimated: scheduled - 120_000
  }
}`,...o.parameters?.docs?.source}}},s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    estimated: scheduled + 180_000
  }
}`,...s.parameters?.docs?.source}}},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    estimated: 0
  }
}`,...c.parameters?.docs?.source}}}})))()}u();export{o as Early,s as Late,c as MissingEstimate,a as OnTime,l as __namedExportsOrder,i as default};