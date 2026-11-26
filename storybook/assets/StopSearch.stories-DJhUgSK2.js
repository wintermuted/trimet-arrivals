import{a as e,n as t}from"./rolldown-runtime-sJBDdmOt.js";import{t as n}from"./react-DlPsW1c0.js";import{t as r}from"./jsx-runtime-MKhVqBIO.js";import{F as i,G as a,I as o,K as s}from"./iframe-Dbz6oMto.js";import{r as c,t as l}from"./src-DJHbN84c.js";function u({label:e,htmlFor:t,hint:n,error:r,className:i,children:o,...s}){let c=(0,f.useId)(),l=`${c}-description`,u=f.Children.only(o),p=t||u.props.inputId||u.props.id||`${c}-control`,m=a(u.props[`aria-describedby`],n||r?l:void 0)||void 0;return(0,d.jsxs)(`div`,{...s,className:a(`wm-field`,i),children:[(0,d.jsx)(`label`,{htmlFor:p,children:e}),(0,f.cloneElement)(u,{id:p,"aria-describedby":m,...u.props.inputId===void 0?{}:{inputId:p},"aria-invalid":r?!0:u.props[`aria-invalid`]}),(n||r)&&(0,d.jsx)(`div`,{id:l,className:r?`wm-field-error`:`wm-field-hint`,children:r||n})]})}var d,f;function p(){return(p=t((()=>{d=r(),f=n(),s()})))()}function m({catalog:e,loading:t,error:n,onRetry:r,renderStopLinks:a,footer:o,inputId:s}){let l=(0,h.useId)(),d=s??l,f=`${d}-title`,[p,m]=(0,h.useState)(``),v=(0,h.useMemo)(()=>{if(!e)return[];let t=c(e.stops,p),n=t.findIndex(e=>String(e.locid)===p.trim());return n>0&&t.unshift(...t.splice(n,1)),t},[e,p]),y=!!p.trim(),b=e&&(e.incompleteRouteCount>0||e.incompleteDirectionCount>0||e.invalidStopCount>0);return(0,g.jsxs)(`section`,{className:`transit-search-primary`,"aria-labelledby":f,children:[(0,g.jsxs)(`header`,{children:[(0,g.jsx)(`h2`,{id:f,children:`Find a stop`}),(0,g.jsx)(`p`,{children:`Search TriMet stops to check arrivals or plan a trip.`})]}),(0,g.jsx)(u,{label:`Stop name or ID`,htmlFor:d,children:(0,g.jsx)(`input`,{id:d,className:`wm-input`,type:`search`,autoComplete:`off`,value:p,onChange:e=>m(e.target.value)})}),!e&&t&&!n&&(0,g.jsx)(`p`,{role:`status`,children:`Loading TriMet stops…`}),n&&(0,g.jsxs)(g.Fragment,{children:[(0,g.jsx)(`p`,{role:`alert`,children:`Could not load TriMet stops. Check your connection and try again.`}),(0,g.jsx)(i,{type:`button`,variant:`secondary`,onClick:r,children:`Retry loading stops`})]}),b&&(0,g.jsx)(`p`,{role:`status`,children:`TriMet returned a partial stop list. Some stops may be missing.`}),e&&y&&(0,g.jsx)(`p`,{role:`status`,children:v.length?v.length>_?`Showing ${_} of ${v.length} matches. Refine your search to see fewer results.`:`${v.length} ${v.length===1?`stop matches`:`stops match`}.`:`No stops match. Try another name or stop ID.`}),v.length>0&&(0,g.jsx)(`ul`,{className:`transit-search-list`,"aria-label":`Matching stops`,children:v.slice(0,_).map(e=>(0,g.jsxs)(`li`,{className:`transit-search-result`,children:[(0,g.jsxs)(`div`,{children:[(0,g.jsx)(`strong`,{children:e.desc}),(0,g.jsxs)(`small`,{children:[`Stop `,e.locid]})]}),(0,g.jsx)(`div`,{className:`transit-search-links`,children:a(e)})]},e.locid))}),o&&(0,g.jsx)(`div`,{className:`transit-search-links`,children:o})]})}var h,g,_;function v(){return(v=t((()=>{o(),p(),l(),h=e(n()),g=r(),_=6,m.__docgenInfo={description:``,methods:[],displayName:`StopSearch`,props:{catalog:{required:!1,tsType:{name:`StopCatalog`},description:``},loading:{required:!0,tsType:{name:`boolean`},description:``},error:{required:!0,tsType:{name:`boolean`},description:``},onRetry:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},renderStopLinks:{required:!0,tsType:{name:`signature`,type:`function`,raw:`(stop: StopCatalogStop) => React.ReactNode`,signature:{arguments:[{type:{name:`StopCatalogStop`},name:`stop`}],return:{name:`ReactReactNode`,raw:`React.ReactNode`}}},description:``},footer:{required:!1,tsType:{name:`ReactReactNode`,raw:`React.ReactNode`},description:``},inputId:{required:!1,tsType:{name:`string`},description:``}}}})))()}function y(){return(y=t((()=>{v()})))()}var b,x,S,C,w,T,E,D,O,k,A,j,M,N,P;function F(){return(F=t((()=>{y(),o(),b=r(),{expect:x,fireEvent:S,fn:C,waitFor:w,within:T}=__STORYBOOK_MODULE_TEST__,E={stops:[101,102,103,104,105,106,107].map(e=>({locid:e,desc:`Example Central Station ${e}`,aliases:[`Transit hub`],dir:`E`,lat:45.5,lng:-122.5,seq:1,tp:!1})),routeCount:1,directionCount:1,stopReferenceCount:7,incompleteRouteCount:0,incompleteDirectionCount:0,incompleteRouteNames:[],invalidStopCount:0},D={title:`Search/Stop search`,component:m,args:{catalog:E,loading:!1,error:!1,onRetry:C(),renderStopLinks:e=>(0,b.jsxs)(i,{type:`button`,variant:`secondary`,size:`sm`,children:[`Choose stop `,e.locid]})},argTypes:{onRetry:{control:!1},renderStopLinks:{control:!1}},parameters:{docs:{description:{component:`Search an injected sample catalog. Result actions are inert examples; fetching and navigation belong to the host application.`}}}},O={},k={play:async({canvasElement:e})=>{let t=T(e);S.change(t.getByRole(`searchbox`,{name:`Stop name or ID`}),{target:{value:`Central`}}),await x(await t.findAllByRole(`listitem`)).toHaveLength(6),await x(await t.findByRole(`status`)).toHaveTextContent(`Showing 6 of 7 matches`)}},A={play:async({canvasElement:e})=>{let t=T(e);S.change(t.getByRole(`searchbox`,{name:`Stop name or ID`}),{target:{value:`Missing`}}),await w(()=>x(t.getByRole(`status`)).toHaveTextContent(`No stops match`))}},j={args:{catalog:void 0,loading:!0}},M={args:{catalog:void 0,error:!0}},N={args:{catalog:{...E,incompleteRouteCount:1}}},P=[`Default`,`MatchingStops`,`NoMatches`,`Loading`,`FailedLoad`,`PartialCatalog`],O.parameters={...O.parameters,docs:{...O.parameters?.docs,source:{originalSource:`{}`,...O.parameters?.docs?.source}}},k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    fireEvent.change(canvas.getByRole("searchbox", {
      name: "Stop name or ID"
    }), {
      target: {
        value: "Central"
      }
    });
    await expect(await canvas.findAllByRole("listitem")).toHaveLength(6);
    await expect(await canvas.findByRole("status")).toHaveTextContent("Showing 6 of 7 matches");
  }
}`,...k.parameters?.docs?.source}}},A.parameters={...A.parameters,docs:{...A.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    fireEvent.change(canvas.getByRole("searchbox", {
      name: "Stop name or ID"
    }), {
      target: {
        value: "Missing"
      }
    });
    await waitFor(() => expect(canvas.getByRole("status")).toHaveTextContent("No stops match"));
  }
}`,...A.parameters?.docs?.source}}},j.parameters={...j.parameters,docs:{...j.parameters?.docs,source:{originalSource:`{
  args: {
    catalog: undefined,
    loading: true
  }
}`,...j.parameters?.docs?.source}}},M.parameters={...M.parameters,docs:{...M.parameters?.docs,source:{originalSource:`{
  args: {
    catalog: undefined,
    error: true
  }
}`,...M.parameters?.docs?.source}}},N.parameters={...N.parameters,docs:{...N.parameters?.docs,source:{originalSource:`{
  args: {
    catalog: {
      ...catalog,
      incompleteRouteCount: 1
    }
  }
}`,...N.parameters?.docs?.source}}}})))()}F();export{O as Default,M as FailedLoad,j as Loading,k as MatchingStops,A as NoMatches,N as PartialCatalog,P as __namedExportsOrder,D as default};