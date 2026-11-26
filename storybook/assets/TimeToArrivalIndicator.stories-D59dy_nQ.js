import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{b as t,n}from"./iframe-Dbz6oMto.js";var r,i,a,o,s,c,l,u,d;function f(){return(f=e((()=>{n(),r=Date.UTC(2026,0,15,17),i={title:`Time/Arrival countdown`,component:t,args:{now:r,estimated:r+33e4}},a={},o={args:{estimated:r+3e4}},s={args:{estimated:r}},c={args:{estimated:r-6e4}},l={args:{estimated:r+39e5}},u={args:{estimated:0}},d=[`Upcoming`,`SecondsAway`,`Due`,`PastArrival`,`OverAnHour`,`MissingEstimate`],a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{}`,...a.parameters?.docs?.source}}},o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    estimated: now + 30_000
  }
}`,...o.parameters?.docs?.source}}},s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    estimated: now
  }
}`,...s.parameters?.docs?.source}}},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    estimated: now - 60_000
  }
}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    estimated: now + 3_900_000
  }
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    estimated: 0
  }
}`,...u.parameters?.docs?.source}}}})))()}f();export{s as Due,u as MissingEstimate,l as OverAnHour,c as PastArrival,o as SecondsAway,a as Upcoming,d as __namedExportsOrder,i as default};