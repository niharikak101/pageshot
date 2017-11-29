const React = require("react");
const sendEvent = require("../../browser-send-event.js");

let cropTool, cropToolBar;
var lineOffset = 4;
var anchrSize = 4;

var mousedown = false;
var clickedArea = {box: -1, pos:'o'};
var x1 = -1;
var y1 = -1;
var x2 = -1;
var y2 = -1;

var boxes = [];
var tmpBox = null;

exports.Editor = class Editor extends React.Component {
  constructor(props) {
    super(props);
    this.mourseout = this.mouseout.bind(this);
    this.mousedown = this.mousedown.bind(this);
    this.mouseup = this.mouseup.bind(this);
    this.mousemove = this.mousemove.bind(this);
    this.draw = this.draw.bind(this);
    this.redraw = this.redraw.bind(this);
    this.setPosition = this.setPosition.bind(this);
    this.canvasWidth = this.props.clip.image.dimensions.x;
    this.canvasHeight = this.props.clip.image.dimensions.y;
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
          <canvas className="crop-tool centered" id="crop-tool" ref={(cropper) => { this.cropper = cropper }} height={canvasHeight} width={canvasWidth}></canvas>
        </div>
      </div>
    </div>
  }

  componentDidUpdate() {
    if (this.state.tool != 'crop') {
      cropTool = null;
      cropToolBar = null;
      this.cropper.removeEventListener("mousemove", this.mousemove);
      this.cropper.removeEventListener("mouseout", this.mouseout);
      this.cropper.removeEventListener("mousedown", this.mousedown, false);
      this.cropper.removeEventListener("mouseup", this.mouseup, false);
    }
    this.edit();
  }

  onClickCrop() {
    this.setState({tool: 'crop'});
     cropToolBar = <div className="annotation-tools">
      <button className={`button transparent confirm-crop`} id="confirm-crop" onClick={this.onClickConfirmCrop.bind(this)} title="confirm-crop">Confirm</button>
      <button className={`button transparent cancel-crop`} id="cancel-crop" onClick={this.onClickCancelCrop.bind(this)} title="cancel-crop">Cancel</button>
    </div>
  }

  onClickConfirmCrop() {
    let x1 = boxes[0].x1;
    let x2 = boxes[0].x2;
    let y1 = boxes[0].y1;
    let y2 = boxes[0].y2;
    if (x1 < 0) {
      x1 = 0;
    }
    if (y1 < 0) {
      y1 = 0
    }
    if (x2 > this.imageCanvas.width) {
      x2 = this.imageCanvas.width;
    }
    if (y2 > this.imageCanvas.height) {
      y2 = this.imageCanvas.height;
    }
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
    window.open(croppedImage.toDataURL("image/png"), '_blank');
  }

  onClickCancelCrop() {
    cropTool = null;
    cropToolBar = null;
    this.cropper.getContext('2d').clearRect(0, 0, this.cropper.width, this.cropper.height);
    boxes = [];
    this.setState({tool: 'pen'});
  }

  mouseup(e) {
    if (clickedArea.box == -1 && tmpBox != null && boxes.length < 1) {
      boxes.push(tmpBox);
    } else if (clickedArea.box != -1) {
      var selectedBox = boxes[clickedArea.box];
      if (selectedBox.x1 > selectedBox.x2) {
        var previousX1 = selectedBox.x1;
        selectedBox.x1 = selectedBox.x2;
        selectedBox.x2 = previousX1;
      }
      if (selectedBox.y1 > selectedBox.y2) {
        var previousY1 = selectedBox.y1;
        selectedBox.y1 = selectedBox.y2;
        selectedBox.y2 = previousY1;
      }
    }

  clickedArea = {box: -1, pos:'o'};
  tmpBox = null;
  mousedown = false;
  }

  mousedown(e) {
    mousedown = true;
    clickedArea = this.findCurrentArea(e.offsetX, e.offsetY);
    x1 = e.offsetX;
    y1 = e.offsetY;
    x2 = e.offsetX;
    y2 = e.offsetY;
  }

  mouseout(e) {
  if (clickedArea.box != -1) {
    var selectedBox = boxes[clickedArea.box];
    if (selectedBox.x1 > selectedBox.x2) {
      var previousX1 = selectedBox.x1;
      selectedBox.x1 = selectedBox.x2;
      selectedBox.x2 > previousX1;
    }
    if (selectedBox.y1 > selectedBox.y2) {
      var previousY1 = selectedBox.y1;
      selectedBox.y1 = selectedBox.y2;
      selectedBox.y2 > previousY1;
    }
  }
  mousedown = false;
  clickedArea = {box: -1, pos:'o'};
  tmpBox = null;
};

  findCurrentArea(x, y) {
  for (let i = 0; i < boxes.length; i++) {
    var box = boxes[i];
    let xCenter = box.x1 + (box.x2 - box.x1) / 2;
    let yCenter = box.y1 + (box.y2 - box.y1) / 2;
    if (box.x1 - lineOffset <  x && x < box.x1 + lineOffset) {
      if (box.y1 - lineOffset <  y && y < box.y1 + lineOffset) {
        return {box: i, pos:'tl'};
      } else if (box.y2 - lineOffset <  y && y < box.y2 + lineOffset) {
        return {box: i, pos:'bl'};
      } else if (yCenter - lineOffset <  y && y < yCenter + lineOffset) {
        return {box: i, pos:'l'};
      }
    } else if (box.x2 - lineOffset < x && x < box.x2 + lineOffset) {
      if (box.y1 - lineOffset <  y && y < box.y1 + lineOffset) {
        return {box: i, pos:'tr'};
      } else if (box.y2 - lineOffset <  y && y < box.y2 + lineOffset) {
        return {box: i, pos:'br'};
      } else if (yCenter - lineOffset <  y && y < yCenter + lineOffset) {
        return {box: i, pos:'r'};
      }
    } else if (xCenter - lineOffset <  x && x < xCenter + lineOffset) {
      if (box.y1 - lineOffset <  y && y < box.y1 + lineOffset) {
        return {box: i, pos:'t'};
      } else if (box.y2 - lineOffset <  y && y < box.y2 + lineOffset) {
        return {box: i, pos:'b'};
      } else if (box.y1 - lineOffset <  y && y < box.y2 + lineOffset) {
        return {box: i, pos:'i'};
      }
    } else if (box.x1 - lineOffset <  x && x < box.x2 + lineOffset) {
      if (box.y1 - lineOffset <  y && y < box.y2 + lineOffset) {
        return {box: i, pos:'i'};
      }
    }
  }
  return {box: -1, pos:'o'};
}

  mousemove(e) {
  if (mousedown && clickedArea.box == -1 && boxes.length < 1) {
    x2 = e.offsetX;
    y2 = e.offsetY;
    this.redraw();
  } else if (mousedown && clickedArea.box != -1) {
    x2 = e.offsetX;
    y2 = e.offsetY;
    let xOffset = x2 - x1;
    let yOffset = y2 - y1;
    x1 = x2;
    y1 = y2;
    if (clickedArea.pos == 'i' ||
      clickedArea.pos == 'tl' ||
      clickedArea.pos == 'l' ||
      clickedArea.pos == 'bl') {
      boxes[clickedArea.box].x1 += xOffset;
    }
    if (clickedArea.pos == 'i' ||
      clickedArea.pos == 'tl' ||
      clickedArea.pos == 't' ||
      clickedArea.pos == 'tr') {
      boxes[clickedArea.box].y1 += yOffset;
    }
    if (clickedArea.pos == 'i' ||
      clickedArea.pos == 'tr' ||
      clickedArea.pos == 'r' ||
      clickedArea.pos == 'br') {
      boxes[clickedArea.box].x2 += xOffset;
    }
    if (clickedArea.pos == 'i' ||
      clickedArea.pos == 'bl' ||
      clickedArea.pos == 'b' ||
      clickedArea.pos == 'br') {
      boxes[clickedArea.box].y2 += yOffset;
    }
    this.redraw();
  }
}

 newBox(x1, y1, x2, y2) {
  let boxX1 = x1 < x2 ? x1 : x2;
  let boxY1 = y1 < y2 ? y1 : y2;
  let boxX2 = x1 > x2 ? x1 : x2;
  let boxY2 = y1 > y2 ? y1 : y2;
  if (boxX2 - boxX1 > lineOffset * 2 && boxY2 - boxY1 > lineOffset * 2) {
    return {x1: boxX1,
            y1: boxY1,
            x2: boxX2,
            y2: boxY2,
            lineWidth: 2,
            color: 'white'};
  } else {
    return null;
  }
}

  redraw() {
    var context = this.cropper.getContext('2d');
    context.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    context.beginPath();
    for (let i = 0; i < boxes.length; i++) {
      this.drawBoxOn(boxes[i], context);
    }
    if (clickedArea.box == -1) {
      tmpBox = this.newBox(x1, y1, x2, y2);
      if (tmpBox != null) {
        this.drawBoxOn(tmpBox, context);
      }
    }
  }

  drawBoxOn(box, context) {
    let xCenter = box.x1 + (box.x2 - box.x1) / 2;
    let yCenter = box.y1 + (box.y2 - box.y1) / 2;

    context.strokeStyle = box.color;
    context.fillStyle = box.color;

    context.rect(box.x1, box.y1, (box.x2 - box.x1), (box.y2 - box.y1));
    context.lineWidth = box.lineWidth;
    context.setLineDash([10, 15]);
    context.fillStyle = 'rgba(0, 0, 0, 0.5)';
    context.fillRect(box.x1, box.y1, (box.x2 - box.x1), (box.y2 - box.y1));
    context.stroke();

    context.fillStyle = box.color;

    context.fillRect(box.x1 - anchrSize, box.y1 - anchrSize, 2 * anchrSize, 2 * anchrSize);
    context.fillRect(box.x1 - anchrSize, yCenter - anchrSize, 2 * anchrSize, 2 * anchrSize);
    context.fillRect(box.x1 - anchrSize, box.y2 - anchrSize, 2 * anchrSize, 2 * anchrSize);
    context.fillRect(xCenter - anchrSize, box.y1 - anchrSize, 2 * anchrSize, 2 * anchrSize);
    context.fillRect(xCenter - anchrSize, yCenter - anchrSize, 2 * anchrSize, 2 * anchrSize);
    context.fillRect(xCenter - anchrSize, box.y2 - anchrSize, 2 * anchrSize, 2 * anchrSize);
    context.fillRect(box.x2 - anchrSize, box.y1 - anchrSize, 2 * anchrSize, 2 * anchrSize);
    context.fillRect(box.x2 - anchrSize, yCenter - anchrSize, 2 * anchrSize, 2 * anchrSize);
    context.fillRect(box.x2 - anchrSize, box.y2 - anchrSize, 2 * anchrSize, 2 * anchrSize);
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
      this.canvasContainer.removeEventListener("mousedown", this.setPosition);
      this.canvasContainer.removeEventListener("mouseenter", this.setPosition);
      this.cropper.addEventListener("mousemove", this.mousemove);
      this.cropper.addEventListener("mouseout", this.mouseout);
      this.cropper.addEventListener("mousedown", this.mousedown, false);
      this.cropper.addEventListener("mouseup", this.mouseup, false);
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
