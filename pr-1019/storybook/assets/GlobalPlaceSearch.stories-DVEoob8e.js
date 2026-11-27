import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{F as r,I as i,g as a,it as o,n as s}from"./iframe-Dbz6oMto.js";function c(e){let[t,n]=(0,l.useState)(e.query),[r,i]=(0,l.useState)(e.open);return(0,l.useEffect)(()=>n(e.query),[e.query]),(0,l.useEffect)(()=>i(e.open),[e.open]),(0,u.jsx)(a,{...e,query:t,open:r,onQueryChange:t=>{e.onQueryChange(t),n(t)},onOpenChange:t=>{e.onOpenChange(t),i(t)}})}var l,u,d,f,p,m,h,g,_,v,y,b,x,S,C;function w(){return(w=e((()=>{s(),i(),l=t(),u=n(),{expect:d,fn:f,userEvent:p,within:m}=__STORYBOOK_MODULE_TEST__,h={title:`Places/Global search`,component:a,args:{query:`Example`,open:!0,onQueryChange:f(),onOpenChange:f(),hint:`Use Arrow Down or Tab to browse results. Escape closes search.`,scope:`Example catalog only. Map filters stay unchanged.`,status:`Showing 2 of 2 example places.`,children:(0,u.jsx)(`ul`,{className:`transit-global-search-results`,children:[`Example Park`,`Example Garden`].map(e=>(0,u.jsx)(o,{variant:`search`,name:e,secondary:`Example address`,renderLink:e=>(0,u.jsx)(`a`,{...e,href:`#example-place`})},e))})},render:e=>(0,u.jsx)(c,{...e}),decorators:[e=>(0,u.jsx)(`div`,{style:{maxWidth:448,minHeight:360},children:(0,u.jsx)(e,{})})],parameters:{docs:{description:{component:`Controlled search field and results popover, with outside-pointer dismissal, Arrow key navigation, and Escape focus restoration. The host supplies matching, highlighted results, loading/error copy, pagination, geography, and route-change dismissal.`}}}},g={play:async({canvasElement:e})=>{let t=m(e),n=t.getByRole(`searchbox`);await p.click(n),await p.keyboard(`{ArrowDown}`),await d(t.getByRole(`link`,{name:/Example Park/})).toHaveFocus(),await p.keyboard(`{ArrowDown}`),await d(t.getByRole(`link`,{name:/Example Garden/})).toHaveFocus(),await p.keyboard(`{Escape}`),await d(n).toHaveFocus(),await d(t.queryByRole(`region`)).not.toBeInTheDocument(),await p.click(n)}},_={args:{open:!1,query:``}},v={args:{children:void 0,status:`Loading the example catalog...`,loadStatus:(0,u.jsx)(`span`,{role:`status`,children:`Loading...`})}},y=f(),b={args:{loadStatus:(0,u.jsx)(r,{size:`sm`,variant:`secondary`,onClick:y,children:`Retry unavailable categories`}),status:`Showing 2 example places from the loaded categories.`},play:async({canvasElement:e})=>{await p.click(m(e).getByRole(`button`,{name:`Retry unavailable categories`})),await d(y).toHaveBeenCalled()}},x={args:{children:void 0,status:`No example places match. Try another name.`}},S={args:{status:`Showing 2 of 12 example places.`,moreAction:(0,u.jsx)(r,{className:`transit-global-search-more`,onClick:f(),children:`Show more places (10 remaining)`})}},C=[`Results`,`Closed`,`Loading`,`PartialFailure`,`Empty`,`MoreResults`],g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement),
      input = canvas.getByRole("searchbox");
    await userEvent.click(input);
    await userEvent.keyboard("{ArrowDown}");
    await expect(canvas.getByRole("link", {
      name: /Example Park/
    })).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(canvas.getByRole("link", {
      name: /Example Garden/
    })).toHaveFocus();
    await userEvent.keyboard("{Escape}");
    await expect(input).toHaveFocus();
    await expect(canvas.queryByRole("region")).not.toBeInTheDocument();
    await userEvent.click(input);
  }
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    open: false,
    query: ""
  }
}`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    children: undefined,
    status: "Loading the example catalog...",
    loadStatus: <span role="status">Loading...</span>
  }
}`,...v.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    loadStatus: <Button size="sm" variant="secondary" onClick={retry}>
        Retry unavailable categories
      </Button>,
    status: "Showing 2 example places from the loaded categories."
  },
  play: async ({
    canvasElement
  }) => {
    await userEvent.click(within(canvasElement).getByRole("button", {
      name: "Retry unavailable categories"
    }));
    await expect(retry).toHaveBeenCalled();
  }
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  args: {
    children: undefined,
    status: "No example places match. Try another name."
  }
}`,...x.parameters?.docs?.source}}},S.parameters={...S.parameters,docs:{...S.parameters?.docs,source:{originalSource:`{
  args: {
    status: "Showing 2 of 12 example places.",
    moreAction: <Button className="transit-global-search-more" onClick={fn()}>
        Show more places (10 remaining)
      </Button>
  }
}`,...S.parameters?.docs?.source}}}})))()}w();export{_ as Closed,x as Empty,v as Loading,S as MoreResults,b as PartialFailure,g as Results,C as __namedExportsOrder,h as default};