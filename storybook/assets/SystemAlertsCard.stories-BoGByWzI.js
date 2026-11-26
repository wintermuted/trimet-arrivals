import{a as e,n as t}from"./rolldown-runtime-sJBDdmOt.js";import{t as n}from"./react-DlPsW1c0.js";import{t as r}from"./jsx-runtime-MKhVqBIO.js";import{n as i}from"./Table-DuDWkR9R.js";import{B as a,D as o,F as s,G as c,H as l,I as u,K as d,L as f,M as p,P as m,R as h,U as g,V as _,W as v,rt as y,z as b}from"./iframe-Dbz6oMto.js";function x(){return(x=t((()=>{g(),v(`h3`,`wm-card-title`)})))()}function S(){return(S=t((()=>{g(),v(`p`,`wm-card-text`)})))()}function C(){return(C=t((()=>{g(),v(`footer`,`wm-card-footer`)})))()}var w,T,E;function D(){return(D=t((()=>{w=r(),T=n(),u(),E=(0,T.forwardRef)(function({loading:e,error:t,onRefresh:n,labels:r,disabled:i,...a},o){return(0,w.jsx)(s,{...a,ref:o,type:`button`,onClick:n,disabled:e||i,"aria-busy":e,children:e?r.loading:t?r.retry:r.idle})})})))()}var O,k,A;function j(){return(j=t((()=>{O=r(),k=n(),d(),A=(0,k.forwardRef)(function({tone:e=`info`,className:t,role:n=`status`,...r},i){return(0,O.jsx)(`div`,{...r,ref:i,role:n,className:c(`wm-alert`,`wm-alert-${e}`,t)})})})))()}function M({systemAlertsData:e,loading:t,error:n,onRefresh:r,loadingContent:i}){return t&&!e?i:(0,F.jsxs)(F.Fragment,{children:[n&&(0,F.jsx)(`p`,{role:`alert`,children:e?`Could not refresh system alerts. Showing the last received alerts.`:`Could not load system alerts. Try again.`}),e?.length?e.map(e=>(0,F.jsxs)(A,{tone:`warning`,children:[(0,F.jsx)(`h3`,{children:e.header_text}),e.desc&&(0,F.jsx)(`p`,{children:e.desc}),e.info_link_url&&(0,F.jsx)(`p`,{style:{marginBottom:0},children:(0,F.jsx)(`a`,{href:e.info_link_url,children:`More Info`})})]},e.id)):n?null:(0,F.jsx)(`p`,{role:`status`,children:`No system alerts right now.`}),(0,F.jsx)(E,{size:`sm`,onRefresh:r,loading:t,error:n,labels:{idle:`Refresh`,loading:`Refreshing...`,retry:`Try again`}})]})}function N(e){return(0,F.jsxs)(_,{children:[(0,F.jsxs)(b,{as:`h5`,children:[(0,F.jsx)(P.default,{name:`bell`}),`System Alerts`]}),(0,F.jsx)(f,{children:M(e)})]})}var P,F;function I(){return(I=t((()=>{j(),l(),h(),a(),D(),n(),P=e(y()),F=r(),N.__docgenInfo={description:``,methods:[],displayName:`SystemAlertsCard`,props:{loading:{required:!0,tsType:{name:`boolean`},description:``},error:{required:!0,tsType:{name:`boolean`},description:``},onRefresh:{required:!0,tsType:{name:`signature`,type:`function`,raw:`() => void`,signature:{arguments:[],return:{name:`void`}}},description:``},loadingContent:{required:!0,tsType:{name:`ReactNode`},description:``},systemAlertsData:{required:!0,tsType:{name:`union`,raw:`IAlert[] | undefined`,elements:[{name:`Array`,elements:[{name:`IAlert`}],raw:`IAlert[]`},{name:`undefined`}]},description:``}}}})))()}function L(){return(L=t((()=>{p(),m(),l(),h(),a(),D(),i(),n(),o(),r()})))()}function R(){return(R=t((()=>{m(),l(),h(),C(),a(),S(),x(),D(),n(),o(),r()})))()}function z(){return(z=t((()=>{I(),L(),R()})))()}var B,V,H,U,W,G,K,q,J,Y,X,Z,Q;function $(){return($=t((()=>{z(),B=r(),{expect:V,fn:H,userEvent:U,within:W}=__STORYBOOK_MODULE_TEST__,G={title:`Alerts/System alerts`,component:N,args:{systemAlertsData:[{id:1,begin:Date.UTC(2026,0,15,17),end:0,header_text:`Example service notice`,desc:`Sample alert content for reviewing product presentation.`,system_wide_flag:!0,info_link_url:``,route:[],location:[]}],loading:!1,error:!1,onRefresh:H(),loadingContent:(0,B.jsx)(`p`,{role:`status`,children:`Loading system alerts...`})},argTypes:{onRefresh:{control:!1},loadingContent:{control:!1}},parameters:{docs:{description:{component:`Injected sample feed; no service requests. Review initial load, empty receipt, failed load, and stale-data refresh failures.`}}}},K={},q={args:{systemAlertsData:[]}},J={args:{systemAlertsData:void 0,loading:!0}},Y={args:{loading:!0}},X={args:{systemAlertsData:void 0,error:!0},play:async({args:e,canvasElement:t})=>{let n=W(t);await U.click(n.getByRole(`button`,{name:`Try again`})),await V(e.onRefresh).toHaveBeenCalledOnce()}},Z={args:{error:!0}},Q=[`WithNotice`,`Empty`,`Loading`,`Refreshing`,`FailedLoad`,`FailedRefresh`],K.parameters={...K.parameters,docs:{...K.parameters?.docs,source:{originalSource:`{}`,...K.parameters?.docs?.source}}},q.parameters={...q.parameters,docs:{...q.parameters?.docs,source:{originalSource:`{
  args: {
    systemAlertsData: []
  }
}`,...q.parameters?.docs?.source}}},J.parameters={...J.parameters,docs:{...J.parameters?.docs,source:{originalSource:`{
  args: {
    systemAlertsData: undefined,
    loading: true
  }
}`,...J.parameters?.docs?.source}}},Y.parameters={...Y.parameters,docs:{...Y.parameters?.docs,source:{originalSource:`{
  args: {
    loading: true
  }
}`,...Y.parameters?.docs?.source}}},X.parameters={...X.parameters,docs:{...X.parameters?.docs,source:{originalSource:`{
  args: {
    systemAlertsData: undefined,
    error: true
  },
  play: async ({
    args,
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", {
      name: "Try again"
    }));
    await expect(args.onRefresh).toHaveBeenCalledOnce();
  }
}`,...X.parameters?.docs?.source}}},Z.parameters={...Z.parameters,docs:{...Z.parameters?.docs,source:{originalSource:`{
  args: {
    error: true
  }
}`,...Z.parameters?.docs?.source}}}})))()}$();export{q as Empty,X as FailedLoad,Z as FailedRefresh,J as Loading,Y as Refreshing,K as WithNotice,Q as __namedExportsOrder,G as default};