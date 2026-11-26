import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{F as r,I as i,n as a,v as o}from"./iframe-Dbz6oMto.js";function s(e){let[t,n]=(0,c.useState)(e.selectedId);return(0,c.useEffect)(()=>n(e.selectedId),[e.selectedId]),(0,l.jsx)(o,{...e,selectedId:t,onSelect:t=>{e.onSelect(t),n(t.id)}})}var c,l,u,d,f,p,m,h,g,_,v,y,b;function x(){return(x=e((()=>{a(),i(),c=t(),l=n(),{expect:u,fn:d,userEvent:f,within:p}=__STORYBOOK_MODULE_TEST__,m=Date.UTC(2026,10,26,20,30),h={title:`Transit/Departure picker`,component:o,args:{departures:[{id:`estimated`,estimated:m,scheduled:m+6e4},{id:`scheduled`,estimated:0,scheduled:m+6e5}],selectedId:`estimated`,onSelect:d()},render:e=>(0,l.jsx)(s,{...e}),parameters:{docs:{description:{component:`Controlled departure selection by stable ID, using shared time preferences and countdown badges. Records require only ID and epoch-millisecond estimated/scheduled times; callbacks retain any additional host fields. Fetching, filtering, refresh policy, and trip integration stay outside. Fixed sample times are not a live departure feed.`}}}},g={play:async({canvasElement:e,args:t})=>{let n=p(e).getAllByRole(`button`);await f.click(n[1]),await u(n[1]).toHaveAttribute(`aria-pressed`,`true`),await u(n[0]).toHaveAttribute(`aria-pressed`,`false`),await u(t.onSelect).toHaveBeenCalledWith(t.departures[1])}},_={args:{departures:[]}},v={args:{disabled:!0,status:(0,l.jsx)(`p`,{role:`status`,children:`Refreshing example departures...`})}},y={args:{status:(0,l.jsxs)(`div`,{role:`alert`,children:[`Example refresh failed. Previous departures remain visible.`,` `,(0,l.jsx)(r,{size:`sm`,onClick:d(),children:`Retry departures`})]})}},b=[`Departures`,`Empty`,`Refreshing`,`FailedRefresh`],g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement,
    args
  }) => {
    const options = within(canvasElement).getAllByRole("button");
    await userEvent.click(options[1]);
    await expect(options[1]).toHaveAttribute("aria-pressed", "true");
    await expect(options[0]).toHaveAttribute("aria-pressed", "false");
    await expect(args.onSelect).toHaveBeenCalledWith(args.departures[1]);
  }
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    departures: []
  }
}`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    status: <p role="status">Refreshing example departures...</p>
  }
}`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    status: <div role="alert">
        Example refresh failed. Previous departures remain visible.{" "}
        <Button size="sm" onClick={fn()}>
          Retry departures
        </Button>
      </div>
  }
}`,...y.parameters?.docs?.source}}}})))()}x();export{g as Departures,_ as Empty,y as FailedRefresh,v as Refreshing,b as __namedExportsOrder,h as default};