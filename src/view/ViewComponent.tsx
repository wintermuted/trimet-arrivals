import React from "react";
import MainNavigationRoute from "../component/nav/MainNavigationRoute";
import { NEARBY_STOPS_VIEW } from "../store/reducers/viewReducer";

interface Props {
  numberOfBookmarks: number;
  timeOfLastLoad: string;
  onInitialLoad: () => void;
}

export default class ViewComponent extends React.Component<Props> {
  public componentDidMount(): void {
    this.props.onInitialLoad();
  }

  public render() {
    const { numberOfBookmarks, timeOfLastLoad } = this.props;

    return (
      <div>
        <MainNavigationRoute
          numberOfBookmarks={numberOfBookmarks}
          timeOfLastLoad={timeOfLastLoad}
          activeView={NEARBY_STOPS_VIEW}
        />
      </div>
    );
  }
}
