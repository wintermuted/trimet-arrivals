import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{n as t,q as n}from"./iframe-Dbz6oMto.js";var r,i,a,o,s,c,l,u,d,f;function p(){return(p=e((()=>{t(),r={title:`Journeys/Walking distance`,component:n,args:{enabled:!0,straightLine:`200 m`,estimate:{status:`ready`,meters:250,seconds:180},formatDistance:e=>`${Math.round(e)} m`},parameters:{docs:{description:{component:`Presents an injected walking result and straight-line fallback. The host fetches routes and chooses distance units; the formatter receives meters.`}}}},i={},a={args:{estimate:{status:`ready`,meters:30,seconds:40}}},o={args:{estimate:void 0,loading:!0}},s={args:{estimate:{status:`unreachable`}}},c={args:{estimate:{status:`uncertain`}}},l={args:{estimate:void 0}},u={args:{enabled:!1}},d={args:{loading:!0}},f=[`Ready`,`UnderOneMinute`,`Calculating`,`Unreachable`,`Uncertain`,`Unavailable`,`StraightLineOnly`,`RefreshingWithPreviousResult`],i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{}`,...i.parameters?.docs?.source}}},a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    estimate: {
      status: "ready",
      meters: 30,
      seconds: 40
    }
  }
}`,...a.parameters?.docs?.source}}},o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    estimate: undefined,
    loading: true
  }
}`,...o.parameters?.docs?.source}}},s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  args: {
    estimate: {
      status: "unreachable"
    }
  }
}`,...s.parameters?.docs?.source}}},c.parameters={...c.parameters,docs:{...c.parameters?.docs,source:{originalSource:`{
  args: {
    estimate: {
      status: "uncertain"
    }
  }
}`,...c.parameters?.docs?.source}}},l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  args: {
    estimate: undefined
  }
}`,...l.parameters?.docs?.source}}},u.parameters={...u.parameters,docs:{...u.parameters?.docs,source:{originalSource:`{
  args: {
    enabled: false
  }
}`,...u.parameters?.docs?.source}}},d.parameters={...d.parameters,docs:{...d.parameters?.docs,source:{originalSource:`{
  args: {
    loading: true
  }
}`,...d.parameters?.docs?.source}}}})))()}p();export{o as Calculating,i as Ready,d as RefreshingWithPreviousResult,u as StraightLineOnly,l as Unavailable,c as Uncertain,a as UnderOneMinute,s as Unreachable,f as __namedExportsOrder,r as default};