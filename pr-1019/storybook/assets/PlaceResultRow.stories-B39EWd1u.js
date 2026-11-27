import{a as e,n as t}from"./rolldown-runtime-sJBDdmOt.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{F as r,I as i,it as a,n as o,rt as s}from"./iframe-Dbz6oMto.js";var c,l,u,d,f,p,m,h,g,_,v,y,b,x;function S(){return(S=t((()=>{o(),i(),c=e(s(),1),l=n(),{expect:u,fn:d,userEvent:f,within:p}=__STORYBOOK_MODULE_TEST__,m={title:`Places/Result row`,component:a,args:{name:`Example Park`,secondary:`Example Avenue`,icon:(0,l.jsx)(c.default,{name:`tree`,"aria-hidden":`true`,className:`transit-place-icon`}),trailing:(0,l.jsx)(c.default,{name:`angle-right`,"aria-hidden":`true`}),renderLink:e=>(0,l.jsx)(`a`,{...e,href:`#example-place`})},decorators:[e=>(0,l.jsx)(`ul`,{style:{listStyle:`none`,padding:0,margin:0,maxWidth:400},children:(0,l.jsx)(e,{})})],parameters:{docs:{description:{component:`Shared nearby, search, and saved-place row layouts. The host supplies icons, highlighted labels, distances, navigation, and a separate action; buttons are never nested in the link.`}}}},h={},g={args:{variant:`search`,name:(0,l.jsxs)(l.Fragment,{children:[(0,l.jsx)(`mark`,{children:`Example`}),` Park`]}),secondary:`Park / Example Avenue`,trailing:(0,l.jsxs)(`span`,{className:`transit-global-search-distance`,children:[(0,l.jsx)(`span`,{children:`250 m`}),(0,l.jsx)(`small`,{children:`straight-line`})]})}},_=d(),v={args:{variant:`saved`,secondary:`Park`,trailing:void 0,action:(0,l.jsx)(r,{size:`sm`,variant:`ghost`,onClick:_,children:`Remove`})},play:async({canvasElement:e})=>{let t=p(e),n=t.getByRole(`button`,{name:`Remove`});await u(t.getByRole(`link`).contains(n)).toBe(!1),await f.click(n),await u(_).toHaveBeenCalled()}},y={args:{variant:`search`,name:`A long example destination name at a busy intersection`,secondary:`An equally long example address`}},b={args:{variant:`saved`,secondary:void 0,icon:void 0,trailing:void 0}},x=[`Nearby`,`SearchHighlighted`,`SavedWithAction`,`LongSearchLabel`,`MissingMetadata`],h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "search",
    name: <>
        <mark>Example</mark> Park
      </>,
    secondary: "Park / Example Avenue",
    trailing: <span className="transit-global-search-distance">
        <span>250 m</span>
        <small>straight-line</small>
      </span>
  }
}`,...g.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "saved",
    secondary: "Park",
    trailing: undefined,
    action: <Button size="sm" variant="ghost" onClick={remove}>
        Remove
      </Button>
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const action = canvas.getByRole("button", {
      name: "Remove"
    });
    await expect(canvas.getByRole("link").contains(action)).toBe(false);
    await userEvent.click(action);
    await expect(remove).toHaveBeenCalled();
  }
}`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "search",
    name: "A long example destination name at a busy intersection",
    secondary: "An equally long example address"
  }
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    variant: "saved",
    secondary: undefined,
    icon: undefined,
    trailing: undefined
  }
}`,...b.parameters?.docs?.source}}}})))()}S();export{y as LongSearchLabel,b as MissingMetadata,h as Nearby,v as SavedWithAction,g as SearchHighlighted,x as __namedExportsOrder,m as default};