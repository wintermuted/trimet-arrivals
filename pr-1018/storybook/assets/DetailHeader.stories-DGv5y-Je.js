import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./jsx-runtime-MKhVqBIO.js";import{F as n,I as r,Y as i,n as a}from"./iframe-Dbz6oMto.js";var o,s,c,l,u,d,f,p,m,h,g,_;function v(){return(v=e((()=>{a(),r(),o=t(),{expect:s,fn:c,userEvent:l,within:u}=__STORYBOOK_MODULE_TEST__,d={title:`Navigation/Detail header`,component:i,args:{title:`54 Example Route`,onBack:c()},parameters:{docs:{description:{component:`Router-free detail heading with optional subtitle and action. Supply onBack for a button or renderBack for a host-owned link; no destination is inferred.`}}}},f={play:async({canvasElement:e,args:t})=>{await l.click(u(e).getByRole(`button`,{name:`Back`})),await s(t.onBack).toHaveBeenCalled()}},p={args:{subtitle:`To Example Destination`,action:(0,o.jsx)(n,{onClick:c(),children:`Route details`})}},m={args:{title:`A long example stop name at a busy intersection`,subtitle:`Stop 101`,truncateTitle:!0},decorators:[e=>(0,o.jsx)(`div`,{style:{width:`min(100%, 280px)`},children:(0,o.jsx)(e,{})})]},h={args:{onBack:void 0,renderBack:e=>(0,o.jsx)(`a`,{...e,href:`#example-stop-list`})}},g={args:{onBack:void 0}},_=[`Default`,`WithSubtitleAndAction`,`NarrowTruncatedTitle`,`HostNavigation`,`WithoutBackControl`],f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement,
    args
  }) => {
    await userEvent.click(within(canvasElement).getByRole("button", {
      name: "Back"
    }));
    await expect(args.onBack).toHaveBeenCalled();
  }
}`,...f.parameters?.docs?.source}}},p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  args: {
    subtitle: "To Example Destination",
    action: <Button onClick={fn()}>Route details</Button>
  }
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    title: "A long example stop name at a busy intersection",
    subtitle: "Stop 101",
    truncateTitle: true
  },
  decorators: [Story => <div style={{
    width: "min(100%, 280px)"
  }}>
        <Story />
      </div>]
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    onBack: undefined,
    renderBack: props => <a {...props} href="#example-stop-list" />
  }
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    onBack: undefined
  }
}`,...g.parameters?.docs?.source}}}})))()}v();export{f as Default,h as HostNavigation,m as NarrowTruncatedTitle,p as WithSubtitleAndAction,g as WithoutBackControl,_ as __namedExportsOrder,d as default};