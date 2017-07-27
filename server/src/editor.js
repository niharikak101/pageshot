const React = require("react");
const sendEvent = require("./browser-send-event.js");

let pos, context, editor;

exports.Editor = class Editor extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    let canvasHeight = document.body.scrollHeight - 100;
    return <div className="main-container">
      <img src={this.props.clipUrl} height="auto"/>
      <div className="canvas-container" id="canvas-container">
        <canvas className="editor highlighter" id="editor" ref="editor" height={canvasHeight} width={window.innerWidth}></canvas>
      </div>
    </div>
  }

  componentDidMount() {
    this.edit();
  }

  edit() {
    pos = { x: 0, y: 0 };
    editor = document.getElementById("editor");
    context = this.refs.editor.getContext('2d');
    document.body.style.margin = 0;
    window.addEventListener("resize", this.resize);
    document.querySelector("#canvas-container").addEventListener("mousemove", this.draw)
    document.querySelector("#canvas-container").addEventListener("mousedown", this.setPosition);
    document.querySelector("#canvas-container").addEventListener("mouseenter", this.setPosition);
  }

  setPosition(e) {
    var rect = editor.getBoundingClientRect();
    pos.x = e.clientX - rect.left,
    pos.y = e.clientY - rect.top
  }

  resize() {
    editor.width = window.innerWidth;
    editor.height = window.innerHeight;
  }

  draw(e) {
    if (e.buttons !== 1) return;
    context.beginPath();

    context.lineWidth = 25;
    context.lineCap = 'round';
    context.strokeStyle = 'rgb(244, 238, 66)';

    context.moveTo(pos.x, pos.y);
    var rect = editor.getBoundingClientRect();
    pos.x = e.clientX - rect.left,
    pos.y = e.clientY - rect.top
    context.lineTo(pos.x, pos.y);

    context.stroke();
  }
}
