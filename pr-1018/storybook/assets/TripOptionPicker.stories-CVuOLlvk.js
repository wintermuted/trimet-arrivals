import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{n as r,r as i}from"./iframe-Dbz6oMto.js";function a(e){let[t,n]=(0,o.useState)(e.selectedIndex),[r,a]=(0,o.useState)(e.editing);return(0,o.useEffect)(()=>n(e.selectedIndex),[e.selectedIndex]),(0,o.useEffect)(()=>a(e.editing),[e.editing]),(0,s.jsx)(i,{...e,selectedIndex:t,editing:r,onSelect:t=>{e.onSelect(t),n(t),a(!1)},onEdit:()=>{e.onEdit?.(),a(!0)},onCancel:()=>{e.onCancel?.(),a(!1)}})}var o,s,c,l,u,d,f,p,m,h,g,_,v,y;function b(){return(b=e((()=>{r(),o=t(),s=n(),{expect:c,fn:l,userEvent:u,within:d}=__STORYBOOK_MODULE_TEST__,f={title:`Journeys/Trip option picker`,component:i,args:{selectedIndex:-1,editing:!1,onSelect:l(),onEdit:l(),onCancel:l(),onHover:l(),onFocus:l(),onCollapse:l(),transitColor:()=>`var(--wm-color-accent)`,itineraries:[{id:`example-1`,startTime:`12:00 PM`,endTime:`12:30 PM`,duration:30,distance:1.25,fare:2.8,numberOfTransfers:0,partial:!1,legs:[{mode:`Walk`,partial:!1},{mode:`Bus`,route:{number:`15`,name:`Example route`},partial:!1}]},{id:`example-2`,startTime:`12:10 PM`,endTime:`12:45 PM`,duration:35,numberOfTransfers:1,partial:!1,legs:[{mode:`Bus`,route:{number:`20`},partial:!1},{mode:`Light Rail`,route:{name:`Example line`},partial:!1}]}]},render:e=>(0,s.jsx)(a,{...e}),parameters:{docs:{description:{component:`Controlled trip comparison, confirmed summary, editing/cancel actions, focus refs, and mouse/keyboard preview callbacks. Reuses shared option summaries and disclosure controls. Touch does not trigger hover previews. The host retains selection, preview cleanup, URL/map integration, and fetching. Example data only.`}}}},p={play:async({canvasElement:e,args:t})=>{let n=d(e),r=n.getByRole(`list`,{name:`Available trips`});await u.click(d(r).getAllByRole(`button`)[1]),await c(t.onSelect).toHaveBeenCalledWith(1),await c(n.getByRole(`heading`,{name:/Option 2/})).toBeInTheDocument(),await u.click(n.getByRole(`button`,{name:`Edit trip`})),await c(n.getByRole(`list`,{name:`Available trips`})).toBeInTheDocument(),await u.click(n.getByRole(`button`,{name:`Cancel`})),await c(n.queryByRole(`list`,{name:`Available trips`})).not.toBeInTheDocument()}},m={args:{selectedIndex:0}},h={args:{selectedIndex:0,editing:!0}},g={args:{itineraries:[{id:`partial`,partial:!0,legs:[]}]}},_={args:{itineraries:[{id:`long`,partial:!1,startTime:`12:00 PM`,endTime:`12:45 PM`,duration:45,legs:[{mode:`Bus`,partial:!1,route:{name:`A long example route name with neighborhood and destination context`}}]}]}},v={args:{itineraries:[]}},y=[`AvailableTrips`,`Confirmed`,`Editing`,`PartialDetails`,`LongRoute`,`Empty`],p.parameters={...p.parameters,docs:{...p.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement,
    args
  }) => {
    const canvas = within(canvasElement),
      list = canvas.getByRole("list", {
        name: "Available trips"
      });
    await userEvent.click(within(list).getAllByRole("button")[1]);
    await expect(args.onSelect).toHaveBeenCalledWith(1);
    await expect(canvas.getByRole("heading", {
      name: /Option 2/
    })).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", {
      name: "Edit trip"
    }));
    await expect(canvas.getByRole("list", {
      name: "Available trips"
    })).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", {
      name: "Cancel"
    }));
    await expect(canvas.queryByRole("list", {
      name: "Available trips"
    })).not.toBeInTheDocument();
  }
}`,...p.parameters?.docs?.source}}},m.parameters={...m.parameters,docs:{...m.parameters?.docs,source:{originalSource:`{
  args: {
    selectedIndex: 0
  }
}`,...m.parameters?.docs?.source}}},h.parameters={...h.parameters,docs:{...h.parameters?.docs,source:{originalSource:`{
  args: {
    selectedIndex: 0,
    editing: true
  }
}`,...h.parameters?.docs?.source}}},g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  args: {
    itineraries: [{
      id: "partial",
      partial: true,
      legs: []
    }]
  }
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    itineraries: [{
      id: "long",
      partial: false,
      startTime: "12:00 PM",
      endTime: "12:45 PM",
      duration: 45,
      legs: [{
        mode: "Bus",
        partial: false,
        route: {
          name: "A long example route name with neighborhood and destination context"
        }
      }]
    }]
  }
}`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    itineraries: []
  }
}`,...v.parameters?.docs?.source}}}})))()}b();export{p as AvailableTrips,m as Confirmed,h as Editing,v as Empty,_ as LongRoute,g as PartialDetails,y as __namedExportsOrder,f as default};