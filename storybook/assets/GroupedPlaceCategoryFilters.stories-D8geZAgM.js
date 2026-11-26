import{a as e,n as t}from"./rolldown-runtime-sJBDdmOt.js";import{t as n}from"./react-DlPsW1c0.js";import{t as r}from"./jsx-runtime-MKhVqBIO.js";import{n as i,rt as a,tt as o}from"./iframe-Dbz6oMto.js";function s(e){let[t,n]=(0,c.useState)(e.selected),[r,i]=(0,c.useState)(e.expandedGroups);return(0,c.useEffect)(()=>n(e.selected),[e.selected]),(0,c.useEffect)(()=>i(e.expandedGroups),[e.expandedGroups]),(0,u.jsx)(o,{...e,selected:t,expandedGroups:r,onSelectionChange:t=>{e.onSelectionChange(t),n(e=>({...e,...t}))},onExpandedGroupsChange:t=>{e.onExpandedGroupsChange(t),i(t)}})}var c,l,u,d,f,p,m,h,g,_,v,y,b;function x(){return(x=t((()=>{i(),c=n(),l=e(a(),1),u=r(),{expect:d,fn:f,userEvent:p,within:m}=__STORYBOOK_MODULE_TEST__,h={title:`Places/Grouped category filters`,component:o,args:{groups:[{id:`nature`,label:`Parks & nature`,icon:(0,u.jsx)(l.default,{name:`tree`,"aria-hidden":`true`,className:`transit-places-group-icon`}),categories:[{id:`park`,label:`Parks`},{id:`garden`,label:`Gardens`}]},{id:`food`,label:`Food & markets`,icon:(0,u.jsx)(l.default,{name:`shopping-basket`,"aria-hidden":`true`,className:`transit-places-group-icon`}),categories:[{id:`cafe`,label:`Cafés`}]}],selected:{park:!0,garden:!1,cafe:!0},expandedGroups:[],onSelectionChange:f(),onExpandedGroupsChange:f()},render:e=>(0,u.jsx)(s,{...e}),parameters:{docs:{description:{component:`Controlled groups with bulk/mixed selection, independent disclosures, and unique target IDs. Selection callbacks send changed category values only; host filters, category definitions, icons, and feed status remain outside.`}}}},g={play:async({canvasElement:e})=>{let t=m(e),n=t.getByRole(`checkbox`,{name:`Toggle all parks & nature`});await d(n).toHaveProperty(`indeterminate`,!0),await p.click(t.getByRole(`button`,{name:`Parks & nature`})),await p.click(n),await d(t.getByRole(`checkbox`,{name:`Gardens`})).toBeChecked(),await d(n).toHaveProperty(`indeterminate`,!1),await p.click(t.getByRole(`checkbox`,{name:`Gardens`})),await d(n).toHaveProperty(`indeterminate`,!0)}},_={args:{selected:{park:!0,garden:!0,cafe:!0},expandedGroups:[`nature`,`food`]}},v={args:{groups:[{id:`nature`,label:`Parks & nature`,status:(0,u.jsx)(`span`,{role:`status`,children:`Loading parks...`}),categories:[{id:`park`,label:`Parks`,status:(0,u.jsx)(`span`,{role:`status`,children:`Loading...`})}]}]}},y={args:{groups:[{id:`empty`,label:`No categories loaded`,categories:[]}],selected:{}}},b=[`MixedSelection`,`ExpandedAllSelected`,`LoadingGroup`,`EmptyGroup`],g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    const bulk = canvas.getByRole("checkbox", {
      name: "Toggle all parks & nature"
    });
    await expect(bulk).toHaveProperty("indeterminate", true);
    await userEvent.click(canvas.getByRole("button", {
      name: "Parks & nature"
    }));
    await userEvent.click(bulk);
    await expect(canvas.getByRole("checkbox", {
      name: "Gardens"
    })).toBeChecked();
    await expect(bulk).toHaveProperty("indeterminate", false);
    await userEvent.click(canvas.getByRole("checkbox", {
      name: "Gardens"
    }));
    await expect(bulk).toHaveProperty("indeterminate", true);
  }
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    selected: {
      park: true,
      garden: true,
      cafe: true
    },
    expandedGroups: ["nature", "food"]
  }
}`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    groups: [{
      id: "nature",
      label: "Parks & nature",
      status: <span role="status">Loading parks...</span>,
      categories: [{
        id: "park",
        label: "Parks",
        status: <span role="status">Loading...</span>
      }]
    }]
  }
}`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    groups: [{
      id: "empty",
      label: "No categories loaded",
      categories: []
    }],
    selected: {}
  }
}`,...y.parameters?.docs?.source}}}})))()}x();export{y as EmptyGroup,_ as ExpandedAllSelected,v as LoadingGroup,g as MixedSelection,b as __namedExportsOrder,h as default};