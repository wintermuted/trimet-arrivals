import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./jsx-runtime-MKhVqBIO.js";import{N as n,P as r,n as i,u as a}from"./iframe-Dbz6oMto.js";var o,s,c,l,u,d,f,p,m,h,g,_,v,y,b;function x(){return(x=e((()=>{i(),r(),o=t(),{expect:s,fn:c,userEvent:l,within:u}=__STORYBOOK_MODULE_TEST__,d=Date.UTC(2026,10,26,20,0),f={title:`Transit/Stop predictions`,component:a,args:{now:d,stops:[{id:`101-1`,name:`Example station`,stopId:101,predictionLabel:`Not reported`,prediction:{at:d+6e5,kind:`Estimated`},routes:(0,o.jsxs)(`span`,{children:[`Routes `,(0,o.jsx)(n,{children:`15`}),` `,(0,o.jsx)(n,{children:`20`})]})},{id:`102-2`,name:`Example destination`,stopId:102,predictionLabel:`Not reported`,prediction:{at:d+12e5,kind:`Scheduled`}}],updateNote:`Pacific time · Example feed updates every 30 seconds`,onRefresh:c()},parameters:{docs:{description:{component:`Provider-neutral stop occurrences with estimated/scheduled times, missing-time labels, last-received markers, route slots, and refresh/error/notice content. Hosts retain batching, polling, trip matching, repeated-stop ambiguity, route metadata fetching, and retry policy. Fixed sample times are not live predictions.`}}}},p={play:async({canvasElement:e,args:t})=>{await l.click(u(e).getByRole(`button`,{name:`Refresh`})),await s(t.onRefresh).toHaveBeenCalled()}},m={args:{loading:!0,stops:[{id:`101`,name:`Example station`,stopId:101,predictionLabel:`Loading...`}]}},h={args:{refreshLabel:`Try again`,error:`Some example predictions could not be refreshed. Last received times are labeled; try again.`,stops:[{id:`101`,name:`Example station`,stopId:101,predictionLabel:`Unavailable`,prediction:{at:d+6e5,kind:`Estimated`},stale:!0},{id:`102`,name:`Example destination`,stopId:102,predictionLabel:`Unavailable`}]}},g={args:{notices:[`Times for repeated stops cannot be matched reliably.`],stops:[{id:`101-1`,name:`Example loop stop`,stopId:101,predictionLabel:`Not reported`},{id:`101-2`,name:`Example loop stop`,stopId:101,predictionLabel:`Not reported`}]}},_={args:{stops:[{id:`101`,name:`Example station`,stopId:101,predictionLabel:`Not reported`,prediction:{at:d+864e5,kind:`Scheduled`}}]}},v={args:{updateNote:void 0,onRefresh:void 0,stops:[{id:`101`,name:`Example station`,stopId:101,predictionLabel:`Select a departure`}]}},y={args:{stops:[],emptyContent:(0,o.jsx)(`p`,{role:`status`,children:`No remaining stops.`})}},b=[`Predictions`,`Loading`,`FailedRefresh`,`RepeatedStops`,`NextDay`,`NoDeparture`,`Empty`],p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement,
    args
  }) => {
    await userEvent.click(within(canvasElement).getByRole("button", {
      name: "Refresh"
    }));
    await expect(args.onRefresh).toHaveBeenCalled();
  }
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    loading: true,
    stops: [{
      id: "101",
      name: "Example station",
      stopId: 101,
      predictionLabel: "Loading..."
    }]
  }
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    refreshLabel: "Try again",
    error: "Some example predictions could not be refreshed. Last received times are labeled; try again.",
    stops: [{
      id: "101",
      name: "Example station",
      stopId: 101,
      predictionLabel: "Unavailable",
      prediction: {
        at: now + 600000,
        kind: "Estimated"
      },
      stale: true
    }, {
      id: "102",
      name: "Example destination",
      stopId: 102,
      predictionLabel: "Unavailable"
    }]
  }
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    notices: ["Times for repeated stops cannot be matched reliably."],
    stops: [{
      id: "101-1",
      name: "Example loop stop",
      stopId: 101,
      predictionLabel: "Not reported"
    }, {
      id: "101-2",
      name: "Example loop stop",
      stopId: 101,
      predictionLabel: "Not reported"
    }]
  }
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    stops: [{
      id: "101",
      name: "Example station",
      stopId: 101,
      predictionLabel: "Not reported",
      prediction: {
        at: now + 86400000,
        kind: "Scheduled"
      }
    }]
  }
}`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    updateNote: undefined,
    onRefresh: undefined,
    stops: [{
      id: "101",
      name: "Example station",
      stopId: 101,
      predictionLabel: "Select a departure"
    }]
  }
}`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    stops: [],
    emptyContent: <p role="status">No remaining stops.</p>
  }
}`,...y.parameters?.docs?.source}}}})))()}x();export{y as Empty,h as FailedRefresh,m as Loading,_ as NextDay,v as NoDeparture,p as Predictions,g as RepeatedStops,b as __namedExportsOrder,f as default};