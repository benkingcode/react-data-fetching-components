import React from 'react';
import PropTypes from 'prop-types';

export default class ComponentDataStore extends React.Component {
  static propTypes = {
    data: PropTypes.object.isRequired
  };

  static childContextTypes = {
    componentDataStore: PropTypes.shape({
      data: PropTypes.object.isRequired
    }).isRequired
  };

  getChildContext() {
    return {
      componentDataStore: {
        data: this.props.data
      }
    };
  }

  render() {
    return React.Children.only(this.props.children);
  }
}
