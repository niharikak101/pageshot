const React = require("react");
const sendEvent = require("../../browser-send-event.js");

let cropTool, cropToolBar;

exports.Editor = class Editor extends React.Component {
  constructor(props) {
    super(props);
    this.divMove = this.divMove.bind(this);
    this.mousedown = this.mousedown.bind(this);
    this.mouseup = this.mouseup.bind(this);
    this.draw = this.draw.bind(this);
    this.setPosition = this.setPosition.bind(this);
    this.state = {
      tool: 'pen',
      color: '#000000',
      size: '5'
    };
  }

  render() {
    let penState = this.state.tool == "pen" ? 'active' : 'inactive';
    let highlighterState = this.state.tool == "highlighter" ? 'active' : 'inactive';
    let canvasHeight = this.props.clip.image.dimensions.y;
    let canvasWidth = this.props.clip.image.dimensions.x;
    let toolBar = (<div className="annotation-tools">
      <button className={`button transparent crop-button`} id="crop" onClick={this.onClickCrop.bind(this)} title="crop"></button>
      <button className={`button transparent pen-button ${penState}`} id="pen" onClick={this.onClickPen.bind(this)} title="pen"></button>
      <button className={`button transparent highlight-button ${highlighterState}`} id="highlight" onClick={this.onClickHighlight.bind(this)} title="highlighter"></button>
    </div>)
    return <div>
      <div className="editor-header default-color-scheme">
        <div className="shot-main-actions annotation-actions">
            {cropToolBar || toolBar}
        </div>
        <div className="shot-alt-actions annotation-alt-actions">
          <button className="button primary save" id="save" onClick={ this.onClickSave.bind(this) }>Save</button>
          <button className="button secondary cancel" id="cancel" onClick={this.onClickCancel.bind(this)}>Cancel</button>
        </div>
      </div>
      <div className="main-container inverse-color-scheme">
        <div className="canvas-container" id="canvas-container" ref={(canvasContainer) => this.canvasContainer = canvasContainer}>
          <canvas className="image-holder centered" id="image-holder" ref={(image) => { this.imageCanvas = image }} height={ canvasHeight } width={ canvasWidth } style={{height: canvasHeight, width: canvasWidth}}></canvas>
          <canvas className="highlighter centered" id="highlighter" ref={(highlighter) => { this.highlighter = highlighter }} height={canvasHeight} width={canvasWidth}></canvas>
          <canvas className={"editor centered " + this.state.tool} id="editor" ref={(editor) => { this.editor = editor }} height={canvasHeight} width={canvasWidth}></canvas>
          {cropTool}
        </div>
      </div>
    </div>
  }

  componentDidUpdate() {
    if (this.state.tool != 'crop') {
      cropTool = null;
      cropToolBar = null;
    }
    this.edit();
  }

  onClickCrop() {
    this.setState({tool: 'crop'});
     cropToolBar = <div className="annotation-tools">
      <button className={`button transparent confirm-crop`} id="confirm-crop" onClick={this.onClickConfirmCrop.bind(this)} title="confirm-crop">Confirm</button>
      <button className={`button transparent cancel-crop`} id="cancel-crop" onClick={this.onClickCancelCrop.bind(this)} title="cancel-crop">Cancel</button>
    </div>
    cropTool = <div className = "crop-container centered" style={{height: this.props.clip.image.dimensions.y, width: this.props.clip.image.dimensions.x, zIndex: 7}}>
      <div className="crop-tool centered" ref={(cropper) => { this.cropper = cropper }} style={{position: "absolute"}}>
        <div className="resizer" style={{height: "10px", width: "10px", zIndex: "3"}} ref={(resizer) => { this.resizer = resizer }}></div>
      </div>
    </div>
  }

  onClickConfirmCrop() {
    let cropWidth = this.cropper.style.width;
    let cropHeight = this.cropper.style.height;
    let croppedImage = document.createElement('canvas');
    croppedImage.width = parseInt(this.cropper.style.width, 10);
    croppedImage.height = parseInt(this.cropper.style.height, 10);
    let croppedContext = croppedImage.getContext("2d");
    croppedContext.drawImage(this.imageCanvas, this.cropper.offsetLeft, this.cropper.offsetTop, croppedImage.width, croppedImage.height, 0, 0, croppedImage.width, croppedImage.height);
    croppedContext.drawImage(this.editor, this.cropper.offsetLeft, this.cropper.offsetTop, croppedImage.width, croppedImage.height, 0, 0, croppedImage.width, croppedImage.height);
    croppedContext.globalCompositeOperation = 'multiply';
    croppedContext.drawImage(this.highlighter, this.cropper.offsetLeft, this.cropper.offsetTop, croppedImage.width, croppedImage.height, 0, 0, croppedImage.width, croppedImage.height);
    window.open(croppedImage.toDataURL("image/png"), '_blank');
  }

  onClickCancelCrop() {
    cropTool = null;
    cropToolBar = null;
    this.setState({tool: 'pen'});
  }

  mouseup() {
    this.canvasContainer.removeEventListener('mousemove', this.divMove, true);
  }

  mousedown(e) {
    this.canvasContainer.addEventListener('mousemove', this.divMove, true);
  }

  divMove(e) {
    var rect = this.cropper.getBoundingClientRect();
    this.cropper.style.position = 'absolute';
    this.cropper.style.left = e.clientX - rect.left + 'px';
    this.cropper.style.top = e.clientY - rect.top + 'px';
  }

  onClickCancel() {
    this.props.onCancelEdit(false);
    sendEvent("cancel", "annotation-toolbar");
  }

  onClickSave() {
    sendEvent("save", "annotation-toolbar");
    this.imageContext.drawImage(this.editor, 0, 0);
    this.imageContext.globalCompositeOperation = 'multiply';
    this.imageContext.drawImage(this.highlighter, 0, 0);
    let dataUrl = this.imageCanvas.toDataURL();
    this.props.onClickSave(dataUrl);
  }

  onClickHighlight() {
    if (this.state.tool != 'highlighter') {
      this.setState({tool: 'highlighter'});
      sendEvent("highlighter-select", "annotation-toolbar");
    }
  }

  onClickPen() {
    if (this.state.tool != 'pen') {
      this.setState({tool: 'pen'});
      sendEvent("pen-select", "annotation-toolbar");
    }
  }

  componentDidMount() {
    this.context = this.editor.getContext('2d');
    this.highlightContext = this.highlighter.getContext('2d');
    let imageContext = this.imageCanvas.getContext('2d');
    let img = new Image();
    img.crossOrigin = 'Anonymous';
    let width = this.props.clip.image.dimensions.x;
    let height = this.props.clip.image.dimensions.y;
    img.onload = () => {
      imageContext.drawImage(img, 0, 0, width, height);
    }
    this.imageContext = imageContext;
    img.src = this.props.clip.image.url;
    this.edit();
  }

  edit() {
    this.pos = { x: 0, y: 0 };
    if (this.state.tool == 'highlighter') {
      this.highlightContext.lineWidth = 20;
      this.highlightContext.strokeStyle = '#ff0';
    } else if (this.state.tool == 'pen') {
      this.context.strokeStyle = this.state.color;
    }
    this.context.lineWidth = this.state.size;
    if (this.state.tool == 'none') {
      this.canvasContainer.removeEventListener("mousemove", this.draw);
      this.canvasContainer.removeEventListener("mousedown", this.setPosition);
      this.canvasContainer.removeEventListener("mouseenter", this.setPosition);
    } else if(this.state.tool == 'crop') {
      this.canvasContainer.removeEventListener("mousemove", this.draw);
      this.cropper.addEventListener("mousedown", this.mousedown, false);
      this.canvasContainer.removeEventListener("mousedown", this.setPosition);
      this.canvasContainer.removeEventListener("mouseenter", this.setPosition);
      this.canvasContainer.addEventListener("mouseup", this.mouseup, false);
    } else {
      this.canvasContainer.addEventListener("mousemove", this.draw);
      this.canvasContainer.addEventListener("mousedown", this.setPosition);
      this.canvasContainer.addEventListener("mouseenter", this.setPosition);
    }
  }

  setPosition(e) {
    var rect = this.editor.getBoundingClientRect();
    this.pos.x = e.clientX - rect.left,
    this.pos.y = e.clientY - rect.top
  }

  draw(e) {
    if (e.buttons !== 1) {
      return null;
    }
    this.drawContext = this.state.tool == 'highlighter' ? this.highlightContext : this.context;
    this.drawContext.beginPath();

    this.drawContext.lineCap = this.state.tool == 'highlighter' ? 'square' : 'round';
    this.drawContext.moveTo(this.pos.x, this.pos.y);
    let rect = this.editor.getBoundingClientRect();
    this.pos.x = e.clientX - rect.left,
    this.pos.y = e.clientY - rect.top
    this.drawContext.lineTo(this.pos.x, this.pos.y);

    this.drawContext.stroke();
  }
}
