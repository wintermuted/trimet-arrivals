import{n as e}from"./rolldown-runtime-sJBDdmOt.js";import{t}from"./react-DlPsW1c0.js";import{t as n}from"./jsx-runtime-MKhVqBIO.js";import{F as r,I as i,m as a,n as o}from"./iframe-Dbz6oMto.js";function s(e){let[t,n]=(0,c.useState)(e.places);return(0,c.useEffect)(()=>n(e.places),[e.places]),(0,l.jsx)(a,{...e,places:t,onRemove:t=>{e.onRemove(t),n(e=>e.filter(e=>e.id!==t))}})}var c,l,u,d,f,p,m,h,g,_,v,y,b,x;function S(){return(S=e((()=>{o(),i(),c=t(),l=n(),{expect:u,fn:d,userEvent:f,within:p}=__STORYBOOK_MODULE_TEST__,m=[`Example Garden`,`Example Park`].map((e,t)=>({id:String(t),name:e,secondary:t?`Park`:`Garden`,renderLink:e=>(0,l.jsx)(`a`,{...e,href:`#example-place`})})),h={title:`Places/Saved places`,component:a,args:{places:m,onRemove:d(),emptyContent:(0,l.jsxs)(`p`,{children:[`Save a place from `,(0,l.jsx)(`a`,{href:`#nearby`,children:`Places nearby`}),` to see it here.`]})},render:e=>(0,l.jsx)(s,{...e}),parameters:{docs:{description:{component:`Saved-place card with supplied ordering, separate removal controls, status, and empty-state content. Storage, sorting, category recovery, retry policy, and navigation remain host-owned.`}}}},g={play:async({canvasElement:e,args:t})=>{let n=p(e);await f.click(n.getByRole(`button`,{name:`Remove Example Garden from saved places`})),await u(t.onRemove).toHaveBeenCalledWith(`0`),await u(n.queryByRole(`link`,{name:/Example Garden/})).not.toBeInTheDocument(),await u(n.getByRole(`link`,{name:/Example Park/})).toBeInTheDocument()}},_={args:{places:[]}},v={args:{status:(0,l.jsxs)(`div`,{role:`alert`,children:[`Example storage unavailable.`,` `,(0,l.jsx)(r,{size:`sm`,onClick:d(),children:`Retry saved places`})]})}},y={args:{places:[{...m[0],secondary:void 0,name:`Older saved example`}]}},b={args:{places:[{...m[0],name:`An example saved destination with a long name and additional neighborhood context`}]}},x=[`Saved`,`Empty`,`StorageFailure`,`MissingCategory`,`LongName`],g.parameters={...g.parameters,docs:{...g.parameters?.docs,source:{originalSource:`{
  play: async ({
    canvasElement,
    args
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", {
      name: "Remove Example Garden from saved places"
    }));
    await expect(args.onRemove).toHaveBeenCalledWith("0");
    await expect(canvas.queryByRole("link", {
      name: /Example Garden/
    })).not.toBeInTheDocument();
    await expect(canvas.getByRole("link", {
      name: /Example Park/
    })).toBeInTheDocument();
  }
}`,...g.parameters?.docs?.source}}},_.parameters={..._.parameters,docs:{..._.parameters?.docs,source:{originalSource:`{
  args: {
    places: []
  }
}`,..._.parameters?.docs?.source}}},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    status: <div role="alert">
        Example storage unavailable.{" "}
        <Button size="sm" onClick={fn()}>
          Retry saved places
        </Button>
      </div>
  }
}`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    places: [{
      ...places[0],
      secondary: undefined,
      name: "Older saved example"
    }]
  }
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    places: [{
      ...places[0],
      name: "An example saved destination with a long name and additional neighborhood context"
    }]
  }
}`,...b.parameters?.docs?.source}}}})))()}S();export{_ as Empty,b as LongName,y as MissingCategory,g as Saved,v as StorageFailure,x as __namedExportsOrder,h as default};