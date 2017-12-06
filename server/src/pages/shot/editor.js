const React = require("react");
const sendEvent = require("../../browser-send-event.js");
let lineOffset = 4;

let mousedown = false;
let x1 = -1;
let x2 = -1;
let y1 = -1;
let y2 = -1;

let boxes = [];

exports.Editor = class Editor extends React.Component {
  constructor(props) {
    super(props);
    this.tempBox = null;
    this.mouseout = this.mouseout.bind(this);
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
    let penState = this.state.tool == "pen" ? 'active' : 'inactive';
    let highlighterState = this.state.tool == "highlighter" ? 'active' : 'inactive';
    let toolBar = (<div className="annotation-tools">
      <button className={`button transparent crop-button`} id="crop" onClick={this.onClickCrop.bind(this)} title="Crop"></button>
      <button className={`button transparent pen-button ${penState}`} id="pen" onClick={this.onClickPen.bind(this)} title="Pen"></button>
      <button className={`button transparent highlight-button ${highlighterState}`} id="highlight" onClick={this.onClickHighlight.bind(this)} title="highlighter"></button>
      <button className={`button transparent clear-button`} id="clear" onClick={this.onClickClear.bind(this)} title="Clear"></button>
    </div>)
    return <div>
      <div className="editor-header default-color-scheme">
        <div className="shot-main-actions annotation-actions">
        {this.cropToolBar || toolBar}
        </div>
        <div className="shot-alt-actions annotation-alt-actions">
          <button className="button primary save" id="save" onClick={ this.onClickSave.bind(this) }>Save</button>
          <button className="button secondary cancel" id="cancel" onClick={this.onClickCancel.bind(this)}>Cancel</button>
        </div>
      </div>
      <div className="main-container inverse-color-scheme">
        <div className="canvas-container" id="canvas-container" ref={(canvasContainer) => this.canvasContainer = canvasContainer}>
          <canvas className="image-holder centered" id="image-holder" ref={(image) => { this.imageCanvas = image }} height={ this.canvasHeight } width={ this.canvasWidth } style={{height: this.canvasHeight, width: this.canvasWidth}}></canvas>
          <canvas className="highlighter centered" id="highlighter" ref={(highlighter) => { this.highlighter = highlighter }} height={this.canvasHeight} width={this.canvasWidth}></canvas>
          <canvas className="editor centered" id="editor" ref={(editor) => { this.editor = editor }} height={this.canvasHeight} width={this.canvasWidth}></canvas>
          <canvas className="crop-tool centered" id="crop-tool" ref={(cropper) => { this.cropper = cropper }} height={this.canvasHeight} width={this.canvasWidth}></canvas>
        </div>
      </div>
    </div>
  }

  componentDidUpdate() {
    if (this.state.tool != 'crop') {
      this.cropToolBar = null;
      this.cropper.removeEventListener("mousemove", this.mousemove);
      this.cropper.removeEventListener("mouseout", this.mouseout);
      this.cropper.removeEventListener("mousedown", this.mousedown);
      this.cropper.removeEventListener("mouseup", this.mouseup);
    }
    this.edit();
  }

  onClickCrop() {
    this.setState({tool: 'crop'});
    this.cropToolBar = <div className="annotation-tools">
      <button className={`button transparent confirm-crop`} id="confirm-crop" onClick={this.onClickConfirmCrop.bind(this)} title="confirm-crop">Confirm</button>
      <button className={`button transparent cancel-crop`} id="cancel-crop" onClick={this.onClickCancelCrop.bind(this)} title="cancel-crop">Cancel</button>
    </div>
  }

  onClickConfirmCrop() {
    let x1 = boxes[0].x1;
    let x2 = boxes[0].x2;
    let y1 = boxes[0].y1;
    let y2 = boxes[0].y2;
    x1 = x1 < 0 ? 0 : x1;
    y1 = y1 < 0 ? 0 : y1;
    x2 = x2 > this.canvasWidth ? this.canvasWidth : x2;
    y2 = y2 > this.canvasHeight ? this.canvasHeight : y2;
    let cropWidth = x2 - x1;
    let cropHeight = y2 - y1;
    let croppedImage = document.createElement('canvas');
    croppedImage.width = parseInt(cropWidth, 10);
    croppedImage.height = parseInt(cropHeight, 10);
    let croppedContext = croppedImage.getContext("2d");
    croppedContext.drawImage(this.imageCanvas, x1, y1, croppedImage.width, croppedImage.height, 0, 0, croppedImage.width, croppedImage.height);
    croppedContext.drawImage(this.editor, x1, y1, croppedImage.width, croppedImage.height, 0, 0, croppedImage.width, croppedImage.height);
    croppedContext.globalCompositeOperation = 'multiply';
    croppedContext.drawImage(this.highlighter, x1, y1, croppedImage.width, croppedImage.height, 0, 0, croppedImage.width, croppedImage.height);
    this.canvasWidth = cropWidth;
    this.canvasHeight = cropHeight;
    let img = new Image();
    let imageContext = this.imageCanvas.getContext('2d');
    img.crossOrigin = 'use-credentials';
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
    this.cropToolBar = null;
    this.cropper.getContext('2d').clearRect(0, 0, this.cropper.width, this.cropper.height);
    boxes = [];
    this.setState({tool: 'pen'});
  }

  mouseup(e) {
    if (this.clickedArea.box == -1 && this.tempBox != null && boxes.length < 1) {
      boxes.push(this.tempBox);
    } else if (this.clickedArea.box != -1) {
      let selectedBox = boxes[this.clickedArea.box];
      if (selectedBox.x1 > selectedBox.x2) {
        let previousX1 = selectedBox.x1;
        selectedBox.x1 = selectedBox.x2;
        selectedBox.x2 = previousX1;
      }
      if (selectedBox.y1 > selectedBox.y2) {
        let previousY1 = selectedBox.y1;
        selectedBox.y1 = selectedBox.y2;
        selectedBox.y2 = previousY1;
      }
    }

    this.clickedArea = {box: -1, pos: 'o'};
    this.tempBox = null;
    mousedown = false;
  }

  mousedown(e) {
    mousedown = true;
    this.clickedArea = this.findCurrentArea(e.offsetX, e.offsetY);
    x1 = e.offsetX;
    y1 = e.offsetY;
    x2 = e.offsetX;
    y2 = e.offsetY;
  }

  mouseout(e) {
    if (this.clickedArea.box != -1) {
      let selectedBox = boxes[this.clickedArea.box];
      if (selectedBox.x1 > selectedBox.x2) {
        let previousX1 = selectedBox.x1;
        selectedBox.x1 = selectedBox.x2;
        selectedBox.x2 > previousX1;
      }
      if (selectedBox.y1 > selectedBox.y2) {
        let previousY1 = selectedBox.y1;
        selectedBox.y1 = selectedBox.y2;
        selectedBox.y2 > previousY1;
    }
  }
    mousedown = false;
    this.clickedArea = {box: -1, pos: 'o'};
    this.tempBox = null;
  }

  findCurrentArea(x, y) {
    let box = boxes[0];
    if (box) {
      let xCenter = box.x1 + (box.x2 - box.x1) / 2;
      let yCenter = box.y1 + (box.y2 - box.y1) / 2;
      if (box.x1 - lineOffset < x && x < box.x1 + lineOffset) {
        if (box.y1 - lineOffset < y && y < box.y1 + lineOffset) {
          return {box: 0, pos: 'tl'};
        } else if (box.y2 - lineOffset < y && y < box.y2 + lineOffset) {
          return {box: 0, pos: 'bl'};
        } else if (yCenter - lineOffset < y && y < yCenter + lineOffset) {
            return {box: 0, pos: 'l'};
        }
      } else if (box.x2 - lineOffset < x && x < box.x2 + lineOffset) {
        if (box.y1 - lineOffset < y && y < box.y1 + lineOffset) {
          return {box: 0, pos: 'tr'};
        } else if (box.y2 - lineOffset < y && y < box.y2 + lineOffset) {
          return {box: 0, pos: 'br'};
        } else if (yCenter - lineOffset < y && y < yCenter + lineOffset) {
          return {box: 0, pos: 'r'};
        }
      } else if (xCenter - lineOffset < x && x < xCenter + lineOffset) {
        if (box.y1 - lineOffset < y && y < box.y1 + lineOffset) {
          return {box: 0, pos: 't'};
        } else if (box.y2 - lineOffset < y && y < box.y2 + lineOffset) {
          return {box: 0, pos: 'b'};
        } else if (box.y1 - lineOffset < y && y < box.y2 + lineOffset) {
          return {box: 0, pos: 'i'};
        }
      } else if (box.x1 - lineOffset < x && x < box.x2 + lineOffset) {
        if (box.y1 - lineOffset < y && y < box.y2 + lineOffset) {
          return {box: 0, pos: 'i'};
        }
      }
    }
    return {box: -1, pos: 'o'};
  }

  mousemove(e) {
    if (mousedown && this.clickedArea.box == -1 && boxes.length < 1) {
      x2 = e.offsetX;
      y2 = e.offsetY;
      this.redraw();
    } else if (mousedown && this.clickedArea.box != -1) {
      x2 = e.offsetX;
      y2 = e.offsetY;
      let xOffset = x2 - x1;
      let yOffset = y2 - y1;
      x1 = x2;
      y1 = y2;
      if (this.clickedArea.pos == 'i' ||
        this.clickedArea.pos == 'tl' ||
        this.clickedArea.pos == 'l' ||
        this.clickedArea.pos == 'bl') {
        boxes[this.clickedArea.box].x1 += xOffset;
      }
      if (this.clickedArea.pos == 'i' ||
        this.clickedArea.pos == 'tl' ||
        this.clickedArea.pos == 't' ||
        this.clickedArea.pos == 'tr') {
        boxes[this.clickedArea.box].y1 += yOffset;
      }
      if (this.clickedArea.pos == 'i' ||
        this.clickedArea.pos == 'tr' ||
        this.clickedArea.pos == 'r' ||
        this.clickedArea.pos == 'br') {
        boxes[this.clickedArea.box].x2 += xOffset;
      }
      if (this.clickedArea.pos == 'i' ||
        this.clickedArea.pos == 'bl' ||
        this.clickedArea.pos == 'b' ||
        this.clickedArea.pos == 'br') {
        boxes[this.clickedArea.box].y2 += yOffset;
      }
      this.redraw();
    }
  }

  redraw() {
    let boxX1 = x1 < x2 ? x1 : x2;
    let boxY1 = y1 < y2 ? y1 : y2;
    let boxX2 = x1 > x2 ? x1 : x2;
    let boxY2 = y1 > y2 ? y1 : y2;
    let context = this.cropper.getContext('2d');
    context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    context.beginPath();
    if (boxes.length == 1) {
      this.drawCropBox(boxes[0], context);
    }
    if (this.clickedArea.box == -1) {
      if (boxX2 - boxX1 > lineOffset * 2 && boxY2 - boxY1 > lineOffset * 2) {
        this.tempBox = {x1: boxX1, y1: boxY1, x2: boxX2, y2: boxY2}
      }
      if (this.tempBox) {
        this.drawCropBox(this.tempBox, context);
      }
    }
  }

  drawCropBox(box, context) {
    let controllerSize = 4;
    let lineWidth = 2;
    let color = 'rgb(255, 255, 255)';
    let xCenter = box.x1 + (box.x2 - box.x1) / 2;
    let yCenter = box.y1 + (box.y2 - box.y1) / 2;

    context.strokeStyle = color;
    context.fillStyle = color;

    context.rect(box.x1, box.y1, (box.x2 - box.x1), (box.y2 - box.y1));
    context.lineWidth = lineWidth;
    context.setLineDash([10, 15]);
    context.fillStyle = 'rgba(0, 0, 0, 0.5)';
    context.fillRect(box.x1, box.y1, (box.x2 - box.x1), (box.y2 - box.y1));
    context.stroke();

    context.fillStyle = color;

    context.fillRect(box.x1 - controllerSize, box.y1 - controllerSize, 2 * controllerSize, 2 * controllerSize);
    context.fillRect(box.x1 - controllerSize, yCenter - controllerSize, 2 * controllerSize, 2 * controllerSize);
    context.fillRect(box.x1 - controllerSize, box.y2 - controllerSize, 2 * controllerSize, 2 * controllerSize);
    context.fillRect(xCenter - controllerSize, box.y1 - controllerSize, 2 * controllerSize, 2 * controllerSize);
    context.fillRect(xCenter - controllerSize, yCenter - controllerSize, 2 * controllerSize, 2 * controllerSize);
    context.fillRect(xCenter - controllerSize, box.y2 - controllerSize, 2 * controllerSize, 2 * controllerSize);
    context.fillRect(box.x2 - controllerSize, box.y1 - controllerSize, 2 * controllerSize, 2 * controllerSize);
    context.fillRect(box.x2 - controllerSize, yCenter - controllerSize, 2 * controllerSize, 2 * controllerSize);
    context.fillRect(box.x2 - controllerSize, box.y2 - controllerSize, 2 * controllerSize, 2 * controllerSize);
  }

  drawImage(height, width, url) {
    let imageContext = this.imageCanvas.getContext('2d');
    let img = new Image();
    img.crossOrigin = 'use-credentials';
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
      this.cropper.addEventListener("mousemove", this.mousemove);
      this.cropper.addEventListener("mouseout", this.mouseout);
      this.cropper.addEventListener("mousedown", this.mousedown);
      this.cropper.addEventListener("mouseup", this.mouseup);
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
