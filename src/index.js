import React, {PropTypes as T} from 'react';
import { soundManager } from 'soundmanager2';

const pendingCalls = [];

function createSound(options, cb) {
  if (soundManager.ok()) {
    cb(soundManager.createSound(options));
    return () => {};
  } else {
    const call = () => {
      cb(soundManager.createSound(options));
    };

    pendingCalls.push(call);

    return () => {
      pendingCalls.splice(pendingCalls.indexOf(call), 1);
    };
  }
}

soundManager.onready(() => {
  pendingCalls.slice().forEach(cb => cb());
});

function noop() {}

const playStatuses = {
  PLAYING: 'PLAYING',
  STOPPED: 'STOPPED',
  PAUSED: 'PAUSED'
};

export default class Sound extends React.Component {
  static status = playStatuses;

  static propTypes = {
    url: T.string.isRequired,
    playStatus: T.oneOf(Object.keys(playStatuses)).isRequired,
    position: T.number,
    playFromPosition: T.number,
    onLoading: T.func,
    onPlaying: T.func,
    onFinishedPlaying: T.func
  };

  static defaultProps = {
    playFromPosition: 0,
    onLoading: noop,
    onPlaying: noop,
    onFinishedPlaying: noop
  };

  componentDidMount() {
    this.createSound(sound => {
      if (this.props.playStatus === playStatuses.PLAYING) {
        sound.play();
      }
    });
  }

  componentWillUnmount() {
    this.removeSound();
  }

  componentDidUpdate(prevProps) {
    const withSound = (sound) => {
      if (!sound) { return; }

      if (this.props.playStatus === playStatuses.PLAYING) {
        if (prevProps.playStatus === playStatuses.STOPPED) {
          sound.play();
        } else if (prevProps.playStatus === playStatuses.PAUSED) {
          sound.resume();
        }
      } else if (this.props.playStatus === playStatuses.STOPPED && prevProps.playStatus !== playStatuses.STOPPED) {
        sound.stop();
      } else {// 'PAUSED'
        if (prevProps.playStatus === playStatuses.PLAYING) {
          sound.pause();
        }
      }

      if (this.props.playFromPosition !== prevProps.playFromPosition) {
        sound.setPosition(this.props.playFromPosition);
      }

      if (this.props.position != null) {
        if (sound.position !== this.props.position &&
          Math.round(sound.position) !== Math.round(this.props.position)) {

          sound.setPosition(this.props.position);
        }
      }
    };

    if (this.props.url !== prevProps.url) {
      this.createSound(withSound);
    } else {
      withSound(this.sound);
    }
  }

  createSound(callback) {
    this.removeSound();

    const props = this.props;

    if (!props.url) { return; }

    this.stopCreatingSound = createSound({
      url: this.props.url,
      whileloading() {
        props.onLoading(this);
      },
      whileplaying() {
        props.onPlaying(this);
      },
      onfinish() {
        props.onFinishedPlaying();
      }
    }, sound => {
      this.sound = sound;
      callback(sound);
    });
  }

  removeSound() {
    if (this.stopCreatingSound) {
      this.stopCreatingSound();
      delete this.stopCreatingSound;
    }

    if (this.sound) {
      try {
        this.sound.destruct();
      } catch (e) {} // eslint-disable-line

      delete this.sound;
    }
  }

  render() {
    return <noscript />;
  }
}
