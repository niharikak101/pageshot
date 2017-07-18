const React = require("react");
const sendEvent = require("./browser-send-event.js");

let pos, context, editor;

exports.Editor = class Editor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      tool: 'none'
    };
  }

  render() {
    let canvasHeight = document.body.scrollHeight - 100;
    return <div>
      <div className="editor-header">
        <button id="highlighter" onClick={this.onClickHighlight.bind(this)}>highlighter</button>
        <button id="pen" onClick={this.onClickPen.bind(this)}>Pen</button>
        <button id="text" onClick={this.onClickPen.bind(this)}>Text</button>
        <button id="" onClick={this.onClickPen.bind(this)}>Pen</button>
      </div>
      <div className="main-container">
        <img src={this.props.clip.image.url} style={{height: "auto", width: this.props.clip.image.dimensions.x + "px", maxWidth: "80%"}}/>
        <div className="canvas-container" id="canvas-container">
          <canvas className={`editor ${this.state.tool}`} id="editor" ref="editor" height={canvasHeight} width={window.innerWidth}></canvas>
        </div>
      </div>
    </div>
  }

  onClickHighlight() {
    this.setState({tool:'highlighter'});
    this.opacity = 0.1;
    this.edit();
  }

  onClickPen() {
    this.setState({tool: 'pen'});
    this.opacity = 1;
    this.edit();
  }

  componentDidMount() {
  }

  edit() {
    pos = { x: 0, y: 0 };
    editor = document.getElementById("editor");
    context = this.refs.editor.getContext('2d');
    context.strokeStyle = `rgb(244, 238, 66, ${this.opacity})`;
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

    context.lineWidth = 15;
    context.lineCap = 'round';

    context.moveTo(pos.x, pos.y);
    var rect = editor.getBoundingClientRect();
    pos.x = e.clientX - rect.left,
    pos.y = e.clientY - rect.top
    context.lineTo(pos.x, pos.y);

    context.stroke();
  }
}
