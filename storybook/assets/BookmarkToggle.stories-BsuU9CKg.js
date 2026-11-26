import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{k as r,n as i}from"./iframe-Dbz6oMto.js";function a(e){let[t,n]=(0,o.useState)(e.isBookmarked);return(0,o.useEffect)(()=>n(e.isBookmarked),[e.isBookmarked]),(0,s.jsx)(r,{...e,isBookmarked:t,onClick:t=>{e.onClick(t),n(e=>!e)}})}var o,s,c,l,u,d,f,p,m,h,g,_,v,y;function b(){return(b=e((()=>{i(),o=t(),s=n(),{expect:c,fn:l,userEvent:u,within:d}=__STORYBOOK_MODULE_TEST__,f={title:`Bookmarks/Bookmark toggle`,component:r,args:{isBookmarked:!1,bookmarkLabel:`Bookmark this stop`,removeLabel:`Remove stop bookmark`,variant:`secondary`,onClick:l()},parameters:{docs:{description:{component:`Controlled bookmark action with an accessible pressed state. Hosts supply labels and own the entity, persistence, errors, and state updates.`}}}},p={},m={args:{isBookmarked:!0}},h={args:{showLabel:!0}},g={args:{bookmarkLabel:`Bookmark Route 15`,removeLabel:`Remove Route 15 bookmark`,showLabel:!0,showIcon:!1,variant:void 0}},_={args:{disabled:!0,showLabel:!0}},v={render:e=>(0,s.jsx)(a,{...e}),play:async({canvasElement:e})=>{let t=d(e);await u.click(t.getByRole(`button`,{name:`Bookmark this stop`})),await c(t.getByRole(`button`,{name:`Remove stop bookmark`})).toHaveAttribute(`aria-pressed`,`true`),await u.click(t.getByRole(`button`,{name:`Remove stop bookmark`})),await c(t.getByRole(`button`,{name:`Bookmark this stop`})).toHaveAttribute(`aria-pressed`,`false`)}},y=[`Unsaved`,`Saved`,`WithLabel`,`TextOnlyRoute`,`Disabled`,`ToggleBookmark`],p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    isBookmarked: true
  }
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    showLabel: true
  }
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    bookmarkLabel: "Bookmark Route 15",
    removeLabel: "Remove Route 15 bookmark",
    showLabel: true,
    showIcon: false,
    variant: undefined
  }
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    disabled: true,
    showLabel: true
  }
}`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  render: args => <ControlledBookmarkToggle {...args} />,
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", {
      name: "Bookmark this stop"
    }));
    await expect(canvas.getByRole("button", {
      name: "Remove stop bookmark"
    })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(canvas.getByRole("button", {
      name: "Remove stop bookmark"
    }));
    await expect(canvas.getByRole("button", {
      name: "Bookmark this stop"
    })).toHaveAttribute("aria-pressed", "false");
  }
}`,...v.parameters?.docs?.source}}}})))()}b();export{_ as Disabled,m as Saved,g as TextOnlyRoute,v as ToggleBookmark,p as Unsaved,h as WithLabel,y as __namedExportsOrder,f as default};