import { Button, Input } from "@wintermuted/ui-react";
import { isEmpty } from "lodash";
import React, { Component } from "react";
import "./AddBookmarkSectionControl.css";

interface Props {
  onSectionNameUpdate: (name: string) => void;
  bookmarkSectionName: string;
  createBookmarkSection: () => void;
}

interface State {
  bookmarkSectionName: string;
}

export default class AddBookmarkSectionControl extends Component<Props, State> {
  constructor(props) {
    super(props);

    this.state = {
      bookmarkSectionName: props.bookmarkSectionName
    };

    this.onChange = this.onChange.bind(this);
    this.onClickAddBookmark = this.onClickAddBookmark.bind(this);
  }

  public componentWillReceiveProps(nextProps: Readonly<Props>): void {
    this.setState({
      bookmarkSectionName: nextProps.bookmarkSectionName
    });
  }

  public onChange(e) {
    const name = e.target.value;

    this.setState(
      {
        bookmarkSectionName: name
      },
      () => this.props.onSectionNameUpdate(name)
    );
  }

  public onClickAddBookmark(e) {
    e.stopPropagation();
    e.preventDefault();

    this.props.createBookmarkSection();
  }

  public render() {
    const noTextEntered = isEmpty(this.state.bookmarkSectionName);

    return (
      <div className="add-bookmark-section-control">
        <form
          className="add-bookmark-input-form"
          onSubmit={this.onClickAddBookmark}
        >
          <div className="add-bookmark-name-input-flex-container">
            <div className="transit-field-row" style={{ marginBottom: "1rem" }}>
              <Input
                type="text"
                aria-label="Bookmark Section Name"
                value={this.state.bookmarkSectionName}
                placeholder="Bookmark Section Name"
                onChange={this.onChange}
                className="add-bookmark-name-input"
              />
              <Button
                id="button-addon2"
                variant="primary"
                type="submit"
                disabled={noTextEntered}
              >
                Create
              </Button>
            </div>
          </div>
        </form>
      </div>
    );
  }
}
