(window.webpackJsonp=window.webpackJsonp||[]).push([[8],{121:function(e,t,n){"use strict";function o(e,t){return e===t}n.d(t,"a",function(){return r});var r=function(e){for(var t=arguments.length,n=Array(t>1?t-1:0),o=1;o<t;o++)n[o-1]=arguments[o];return function(){for(var t=arguments.length,o=Array(t),r=0;r<t;r++)o[r]=arguments[r];var a=0,c=o.pop(),u=function(e){var t=Array.isArray(e[0])?e[0]:e;if(!t.every(function(e){return"function"===typeof e})){var n=t.map(function(e){return typeof e}).join(", ");throw new Error("Selector creators expect all input-selectors to be functions, instead received the following types: ["+n+"]")}return t}(o),i=e.apply(void 0,[function(){return a++,c.apply(null,arguments)}].concat(n)),l=e(function(){for(var e=[],t=u.length,n=0;n<t;n++)e.push(u[n].apply(null,arguments));return i.apply(null,e)});return l.resultFunc=c,l.dependencies=u,l.recomputations=function(){return a},l.resetRecomputations=function(){return a=0},l}}(function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:o,n=null,r=null;return function(){return function(e,t,n){if(null===t||null===n||t.length!==n.length)return!1;for(var o=t.length,r=0;r<o;r++)if(!e(t[r],n[r]))return!1;return!0}(t,n,arguments)||(r=e.apply(null,arguments)),n=arguments,r}})},122:function(e,t,n){"use strict";n.d(t,"d",function(){return a}),n.d(t,"c",function(){return c}),n.d(t,"b",function(){return u}),n.d(t,"a",function(){return i}),n.d(t,"e",function(){return l});var o=n(8),r=n(121),a=function(e){return e.bookmarksReducer.bookmarks},c=Object(r.a)(a,function(e){return e}),u=Object(r.a)(a,function(e){return Object(o.map)(e,function(e){return e})}),i=Object(r.a)(a,function(e){return!Object(o.isEmpty)(e)&&Object.keys(e).length}),l=Object(r.a)(function(e,t){return e.bookmarksReducer.bookmarks[t]},function(e){return!Object(o.isEmpty)(e)})},123:function(e,t,n){"use strict";n.d(t,"a",function(){return u});var o=n(1),r=n.n(o),a=n(50),c=n.n(a);n(70);function u(){return r.a.createElement("div",{className:"load-indicator component-indicator"},r.a.createElement(c.a,{name:"spinner",size:"lg",spin:!0}),"Loading component!")}},124:function(e,t,n){},127:function(e,t,n){"use strict";n.d(t,"a",function(){return r}),n.d(t,"b",function(){return a});var o=n(6),r=function(e){return{payload:{locationId:e},type:o.i}},a=function(e){return{payload:{radiusInFeet:e},type:o.m}}},128:function(e,t,n){"use strict";n.d(t,"d",function(){return r}),n.d(t,"b",function(){return a}),n.d(t,"a",function(){return c}),n.d(t,"e",function(){return u}),n.d(t,"c",function(){return i});var o=n(121),r=Object(o.a)(function(e){return e.stopsReducer.loading},function(e){return e}),a=Object(o.a)(function(e){return e.stopsReducer.stopLocations},function(e){return e}),c=Object(o.a)(function(e){return e.stopsReducer.nearbyRoutes},function(e){return e}),u=Object(o.a)(function(e){return e.stopsReducer.timeOfLastLoad},function(e){return e}),i=Object(o.a)(function(e,t){return e.stopsReducer.stopLocations[t]},function(e){return e})},131:function(e,t,n){"use strict";n.d(t,"a",function(){return r});var o=n(6),r=function(){return{type:o.f}}},143:function(e,t,n){},374:function(e,t,n){"use strict";n.r(t);var o=n(51),r=n(127),a=n(131),c=n(122),u=n(121),i=Object(u.a)(function(e){return e.currentLocationReducer.coordinates},function(e){return e}),l=n(128),s=n(45),d=n(46),f=n(48),m=n(47),p=n(49),b=n(52),v=n(1),h=n.n(v),O=n(123),y=n(50),j=n.n(y);n(70);var E=n(53),k=n.n(E),L=(n(143),function(e){function t(e){var n;return Object(s.a)(this,t),(n=Object(f.a)(this,Object(m.a)(t).call(this,e))).modalRoot=void 0,n.el=void 0,n.el=document.createElement("div"),n}return Object(p.a)(t,e),Object(d.a)(t,[{key:"componentDidMount",value:function(){this.modalRoot=document.getElementById("modal-root"),this.modalRoot.appendChild(this.el)}},{key:"componentWillUnmount",value:function(){this.modalRoot.removeChild(this.el)}},{key:"render",value:function(){return k.a.createPortal(this.props.children,this.el)}}]),t}(h.a.Component));function g(e){return e?h.a.createElement("section",null,h.a.createElement("h5",null,e.desc),h.a.createElement("p",null,"Type: ",e.type),h.a.createElement("h4",null,"Directions:"),e.dir.map(function(e){return h.a.createElement("ul",{key:e.dir},h.a.createElement("li",null,e.desc," | ",e.dir))})):null}function R(e){var t=e.route,n=e.closeModal;return h.a.createElement("div",{className:"modal-content"},function(e){return h.a.createElement("header",{className:"info-header"},h.a.createElement("h4",null,"Route Info"),h.a.createElement("div",{className:"close-button-container"},h.a.createElement("button",{onClick:e,name:"Close",title:"Close"},h.a.createElement(j.a,{name:"times"}))))}(n),g(t))}n(124);var M=Object(v.lazy)(function(){return Promise.all([n.e(203),n.e(7)]).then(n.bind(null,377))}),w=Object(v.lazy)(function(){return n.e(5).then(n.bind(null,146))}),N=Object(v.lazy)(function(){return n.e(6).then(n.bind(null,372))}),S=function(e){function t(e){var n;return Object(s.a)(this,t),(n=Object(f.a)(this,Object(m.a)(t).call(this,e))).state={modalOpen:!1,routeInfo:null},n.openModal=n.openModal.bind(Object(b.a)(Object(b.a)(n))),n.closeModal=n.closeModal.bind(Object(b.a)(Object(b.a)(n))),n}return Object(p.a)(t,e),Object(d.a)(t,[{key:"componentDidMount",value:function(){this.props.onInitialLoad();var e=this.props.loadStopData;e&&e(1e3)}},{key:"render",value:function(){var e=this.props,t=e.numberOfBookmarks,n=e.timeOfLastLoad;return h.a.createElement("div",null,h.a.createElement(w,{numberOfBookmarks:t,timeOfLastLoad:n}),this.getNearbyStops())}},{key:"closeModal",value:function(){this.setState({modalOpen:!1,routeInfo:null})}},{key:"openModal",value:function(e){this.setState({modalOpen:!0,routeInfo:e})}},{key:"getNearbyStops",value:function(){var e=this.props,t=e.loading,n=void 0===t||t,o=e.stopLocations;return h.a.createElement("main",{className:"main-view"},h.a.createElement("div",{id:"nearby-stops-view-component"},!n&&o&&this.nearbyStops()))}},{key:"nearbyStops",value:function(){var e=this.props,t=e.stopLocations,n=e.currentLocation,o=e.nearbyRoutes;return h.a.createElement("div",{className:"nearby-stops"},h.a.createElement("main",null,h.a.createElement("div",{className:"flex-container"},h.a.createElement("section",{className:"flex-stops"},h.a.createElement(v.Suspense,{fallback:h.a.createElement("div",{className:"load-indicator map-indicator"},h.a.createElement(j.a,{name:"spinner",size:"lg",spin:!0}),"Loading map!")},h.a.createElement(M,{currentLocation:n,stopLocations:t,nearbyRoutes:o})),h.a.createElement(v.Suspense,{fallback:Object(O.a)()},h.a.createElement(N,{stopLocations:t,openModal:this.openModal,nearbyRoutes:o}))),this.state.modalOpen&&this.showModal())))}},{key:"showModal",value:function(){return h.a.createElement("div",{className:"flex-info"},h.a.createElement("aside",{id:"modal-root",className:"modal-wrapper"}),h.a.createElement(L,null,h.a.createElement(R,{route:this.state.routeInfo,closeModal:this.closeModal})))}}]),t}(h.a.Component),I=Object(o.b)(function(e){return{currentLocation:i(e),loading:Object(l.d)(e),nearbyRoutes:Object(l.a)(e),numberOfBookmarks:Object(c.a)(e),stopLocations:Object(l.b)(e),timeOfLastLoad:Object(l.e)(e)}},function(e){return{loadStopData:function(t){e(Object(r.b)(t))},onInitialLoad:function(){e(Object(a.a)())}}})(S);t.default=I}}]);
//# sourceMappingURL=NearbyTransitViewContainer.53761360.chunk.js.map