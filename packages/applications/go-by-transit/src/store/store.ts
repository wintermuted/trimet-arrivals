import { applyMiddleware, compose, createStore } from "redux";
import { thunk } from "redux-thunk";
import reducers from "./reducers";

export default function appStore() {
  const composeEnhancers =
    // @ts-ignore
    window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
  const store = createStore(
    reducers,
    composeEnhancers(applyMiddleware(thunk))
  );

  return store;
}
