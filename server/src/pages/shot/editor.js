const React = require("react");
const sendEvent = require("../../browser-send-event.js");

let mousedown = false;
let resizing = false;
let creating = false;
let resizeDirection;
let resizeStartPos;
let selectedPos = {};
let movingPos = {};

let boxes = [];
const movements = {
  topLeft: ["x1", "y1"],
  top: [null, "y1"],
  topRight: ["x2", "y1"],
  left: ["x1", null],
  right: ["x2", null],
  bottomLeft: ["x1", "y2"],
  bottom: [null, "y2"],
  bottomRight: ["x2", "y2"],
  move: ["*", "*"]
};


exports.Editor = class Editor extends React.Component {
  constructor(props) {
    super(props);
    this.tempBox = null;
    this.mousedown = this.mousedown.bind(this);
    this.mouseup = this.mouseup.bind(this);
    this.mousemove = this.mousemove.bind(this);
    this.draw = this.draw.bind(this);
    this.setPosition = this.setPosition.bind(this);

    this.canvasWidth = this.props.clip.image.dimensions.x;
    this.canvasHeight = this.props.clip.image.dimensions.y;
    this.state = {
      tool: 'pen',
      color: '#000',
      size: '5'
    };
  }

  render() {
    return <div>
      { this.cropToolBar || this.renderToolBar() }
      <div className="main-container inverse-color-scheme">
        <div className="canvas-container" id="canvas-container" ref={(canvasContainer) => this.canvasContainer = canvasContainer}>
        <canvas className="crop-tool centered" id="crop-tool" ref={(cropper) => { this.cropper = cropper }} height={this.canvasHeight} width={this.canvasWidth}></canvas>
          <canvas className="image-holder centered" id="image-holder" ref={(image) => { this.imageCanvas = image }} height={ this.canvasHeight } width={ this.canvasWidth } style={{height: this.canvasHeight, width: this.canvasWidth}}></canvas>
          <canvas className="highlighter centered" id="highlighter" ref={(highlighter) => { this.highlighter = highlighter }} height={this.canvasHeight} width={this.canvasWidth}></canvas>
          <canvas className="editor centered" id="editor" ref={(editor) => { this.editor = editor }} height={this.canvasHeight} width={this.canvasWidth}></canvas>
          <div className="crop-container centered" ref={(cropContainer) => this.cropContainer = cropContainer} style={{height: this.canvasHeight, width:this.canvasWidth}}></div>
        </div>
      </div>
    </div>
  }

  renderToolBar() {
    let penState = this.state.tool == "pen" ? 'active' : 'inactive';
    let highlighterState = this.state.tool == "highlighter" ? 'active' : 'inactive';
    return <div className="editor-header default-color-scheme">
      <div className="shot-main-actions annotation-actions">
        <div className="annotation-tools">
          <button className={`button transparent crop-button`} id="crop" onClick={this.onClickCrop.bind(this)} title="Crop"></button>
          <button className={`button transparent pen-button ${penState}`} id="pen" onClick={this.onClickPen.bind(this)} title="Pen"></button>
          <button className={`button transparent highlight-button ${highlighterState}`} id="highlight" onClick={this.onClickHighlight.bind(this)} title="highlighter"></button>
          <button className={`button transparent clear-button`} id="clear" onClick={this.onClickClear.bind(this)} title="Clear"></button>
        </div>
      </div>
      <div className="shot-alt-actions annotation-alt-actions">
        <button className="button primary save" id="save" onClick={ this.onClickSave.bind(this) }>Save</button>
        <button className="button secondary cancel" id="cancel" onClick={this.onClickCancel.bind(this)}>Cancel</button>
      </div>
    </div>
  }

  componentDidUpdate() {
    this.edit();
  }

  onClickCrop() {
    this.setState({tool: 'crop'});
    this.cropToolBar = <div className="editor-header default-color-scheme"><div className="annotation-tools">
      <button className={`button transparent confirm-crop`} id="confirm-crop" onClick={this.onClickConfirmCrop.bind(this)} title="confirm-crop">Crop</button>
      <button className={`button transparent cancel-crop`} id="cancel-crop" onClick={this.onClickCancelCrop.bind(this)} title="cancel-crop">Cancel</button>
    </div></div>;
  }

  onClickConfirmCrop() {
    let x1 = selectedPos.left;
    let x2 = selectedPos.right;
    let y1 = selectedPos.top;
    let y2 = selectedPos.bottom;
    x1 = x1 < 0 ? 0 : x1;
    y1 = y1 < 0 ? 0 : y1;
    x2 = Math.min(x2, this.canvasWidth);
    y2 = Math.min(this.canvasHeight, y2);
    let cropWidth = x2 - x1;
    let cropHeight = y2 - y1;
    let croppedImage = document.createElement('canvas');
    croppedImage.width = Math.floor(cropWidth);
    croppedImage.height = Math.floor(cropHeight);
    let croppedContext = croppedImage.getContext("2d");
    croppedContext.drawImage(this.imageCanvas, x1, y1, croppedImage.width, croppedImage.height, 0, 0, croppedImage.width, croppedImage.height);
    croppedContext.drawImage(this.editor, x1, y1, croppedImage.width, croppedImage.height, 0, 0, croppedImage.width, croppedImage.height);
    croppedContext.globalCompositeOperation = 'multiply';
    croppedContext.drawImage(this.highlighter, x1, y1, croppedImage.width, croppedImage.height, 0, 0, croppedImage.width, croppedImage.height);
    this.canvasWidth = cropWidth;
    this.canvasHeight = cropHeight;
    let img = new Image();
    let imageContext = this.imageCanvas.getContext('2d');
    img.crossOrigin = 'Anonymous';
    let width = cropWidth;
    let height = cropHeight;
    img.onload = () => {
      imageContext.drawImage(img, 0, 0, width, height);
    }
    this.imageContext = imageContext;
    img.src = croppedImage.toDataURL("image/png");
    this.setState({image: 'cropped'});
    this.edit();
    this.onClickCancelCrop();
  }

  onClickCancelCrop() {
    this.removeCropBox();
    this.cropToolBar = null;
    this.cropper.getContext('2d').clearRect(0, 0, this.cropper.width, this.cropper.height);
    boxes = [];
    this.setState({tool: 'pen'});
  }

  mouseup(e) {
    mousedown = false;
    creating = false;
    resizing = false;
  }

  mousedown(e) {
    mousedown = true;
    let rect = this.cropContainer.getBoundingClientRect();
    if (!this.cropBox) {
      creating = true;
      selectedPos.top = e.clientY - rect.top;
      selectedPos.left = e.clientX - rect.left;
      this.displayCropBox(selectedPos);
    } else {
      let target = e.target;
      let direction = this.findClickedArea(target);
      if (direction) {
        resizing = true;
        resizeDirection = direction;
        resizeStartPos = {x: e.clientX - rect.left, y: e.clientY - rect.top};
        movingPos = JSON.parse(JSON.stringify(selectedPos));
        this.resizeCropBox(e, direction);
      }
    }
  }

  mousemove(e) {
    let rect = this.cropContainer.getBoundingClientRect();
    if (mousedown && creating) {
      selectedPos.bottom = Math.min(this.editor.height, e.clientY - rect.top);
      selectedPos.right = Math.min(this.editor.width, e.clientX - rect.left);
      this.displayCropBox(selectedPos);
    }
    if (mousedown && resizing) {
      this.resizeCropBox(e);
    }
  }

  resizeCropBox(event, direction) {
    let rect = this.cropContainer.getBoundingClientRect();
    let diffX = event.clientX - rect.left - resizeStartPos.x;
    let diffY = event.clientY - rect.top - resizeStartPos.y;
    let movement = movements[resizeDirection];
    if (movement[0]) {
      let moveX = movement[0];
      if (moveX.includes("*")) {
        selectedPos.right = Math.min(this.editor.width, movingPos.right + diffX);
        selectedPos.left = Math.max(0, movingPos.left + diffX);
      }
      if (moveX.includes('x2')) {
        selectedPos.right = Math.min(this.editor.width, resizeStartPos.x + diffX);
      }
      if (moveX.includes('x1')) {
        selectedPos.left = Math.max(0, resizeStartPos.x + diffX);
      }
    }
    if (movement[1]) {
      let moveY = movement[1];
      if (moveY.includes("*")) {
        selectedPos.top = Math.max(0, movingPos.top + diffY);
        selectedPos.bottom = Math.min(this.editor.height, movingPos.bottom + diffY);
      }
      if (moveY.includes('y2')) {
        selectedPos.bottom = Math.min(this.editor.height, resizeStartPos.y + diffY);
      }
      if (moveY.includes('y1')) {
        selectedPos.top = Math.max(0, resizeStartPos.y + diffY);
      }
    }
    this.displayCropBox(selectedPos, direction);
  }

  findClickedArea(target) {
    let movements = ["topLeft", "top", "topRight", "left", "right", "bottomLeft", "bottom", "bottomRight"];
      if (target.classList.contains("mover-target") || target.classList.contains("mover")) {
        for (let name of movements) {
          if (target.classList.contains("direction-" + name) || target.parentNode.classList.contains("direction-" + name)) {
            return name;
          }
        }
      } else if (target.classList.contains("highlight")) {
        return "move";
      }
    return null;
  }

  removeCropBox() {
    while (this.cropContainer.firstChild) {
      this.cropContainer.removeChild(this.cropContainer.firstChild);
    }
    this.cropBox = null;
  }

  displayCropBox(pos, direction) {
    this.createCropBox();
    let rect = this.cropBox.getBoundingClientRect();
    this.cropBox.style.position = "absolute";
    this.cropBox.style.top = pos.top + "px";
    this.cropBox.style.left = pos.left + "px";
    this.cropBox.style.height = pos.bottom - pos.top + "px";
    this.cropBox.style.width = pos.right - pos.left + "px";
    this.bgTop.style.top = "0px";
    this.bgTop.style.height = pos.top + "px";
    this.bgTop.style.left = "0px";
    this.bgTop.style.width = "100%";
    this.bgBottom.style.top = pos.bottom + "px";
    this.bgBottom.style.height = "100%";
    this.bgBottom.style.left = "0px";
    this.bgBottom.style.width = "100%";
    this.bgLeft.style.top = pos.top + "px";
    this.bgLeft.style.height = pos.bottom - pos.top + "px";
    this.bgLeft.style.left = "0px";
    this.bgLeft.style.width = pos.left + "px";
    this.bgRight.style.top = pos.top + "px";
    this.bgRight.style.height = pos.bottom - pos.top + "px";
    this.bgRight.style.left = pos.right + "px";
    this.bgRight.style.width = "100%";
  }

  createCropBox() {
    let movements = ["topLeft", "top", "topRight", "left", "right", "bottomLeft", "bottom", "bottomRight"];
    if (this.cropBox) {
      return;
    }
    let cropBox = document.createElement('div')
    cropBox.className = 'highlight';
    for (let name of movements) {
      let elTarget = document.createElement("div");
      elTarget.className = "mover-target direction-" + name;
      let elMover = document.createElement("div");
      elMover.className = "mover";
      elTarget.appendChild(elMover);
      cropBox.appendChild(elTarget);
    }
    this.bgTop = document.createElement("div");
    this.bgTop.className = "bghighlight";
    this.cropContainer.appendChild(this.bgTop);
    this.bgLeft = document.createElement("div");
    this.bgLeft.className = "bghighlight";
    this.cropContainer.appendChild(this.bgLeft);
    this.bgRight = document.createElement("div");
    this.bgRight.className = "bghighlight";
    this.cropContainer.appendChild(this.bgRight);
    this.bgBottom = document.createElement("div");
    this.bgBottom.className = "bghighlight";
    this.cropContainer.appendChild(this.bgBottom);
    this.cropContainer.appendChild(cropBox);
    this.cropBox = cropBox;
  }


  drawImage(height, width, url) {
    let imageContext = this.imageCanvas.getContext('2d');
    let img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      imageContext.drawImage(img, 0, 0, width, height);
    }
    this.imageContext = imageContext;
    img.src = url || this.props.clip.image.url;
  }


  onClickClear() {
    this.setState({tool: this.state.tool});
    this.setState({image: 'cleared'});
    this.canvasHeight = this.props.clip.image.dimensions.y;
    this.canvasWidth = this.props.clip.image.dimensions.x;
    sendEvent("clear-select", "annotation-toolbar");
    this.context.clearRect(0, 0, this.editor.width, this.editor.height);
    this.highlightContext.clearRect(0, 0, this.editor.width, this.editor.height);
    this.drawImage(this.canvasHeight, this.canvasWidth);
    this.edit();
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
    let dimensions = {x: this.canvasWidth, y: this.canvasHeight};
    this.props.onClickSave(dataUrl, dimensions);
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
    this.drawImage(this.canvasHeight, this.canvasWidth);
    this.edit();
  }

  edit() {
    if (this.state.tool != 'crop') {
      this.cropToolBar = null;
      document.removeEventListener("mousemove", this.mousemove);
      document.removeEventListener("mousedown", this.mousedown);
      document.removeEventListener("mouseup", this.mouseup);
    }
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
    } else if (this.state.tool == 'crop') {
      this.canvasContainer.removeEventListener("mousemove", this.draw);
      this.canvasContainer.removeEventListener("mousedown", this.setPosition);
      this.canvasContainer.removeEventListener("mouseenter", this.setPosition);
      document.addEventListener("mousemove", this.mousemove);
      document.addEventListener("mousedown", this.mousedown);
      document.addEventListener("mouseup", this.mouseup);
    } else {
      this.canvasContainer.addEventListener("mousemove", this.draw);
      this.canvasContainer.addEventListener("mousedown", this.setPosition);
      this.canvasContainer.addEventListener("mouseenter", this.setPosition);
    }
  }

  setPosition(e) {
    let rect = this.editor.getBoundingClientRect();
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
