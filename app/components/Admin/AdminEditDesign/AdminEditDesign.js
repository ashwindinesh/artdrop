import React from 'react'
import reactor from 'state/reactor'
import Store from 'state/main'
import {rotateColorPalette} from 'state/utils'
import RenderLayers from 'components/Design/RenderLayers/RenderLayers'
import RenderLayersCanvas from 'components/Design/RenderLayersCanvas/RenderLayersCanvas'
import ColorsButtonRotate from 'components/ColorsButtonRotate/ColorsButtonRotate'
import ColorPalette from 'components/ColorPalette/ColorPalette'
import Tags from 'components/Tags/Tags'
import Immutable from 'Immutable'
import Notification from 'components/Notification/Notification'
import Router from 'react-router'
import {imageUrlForLayer,imageUrlForLayerImage,imageUrlForSurface} from 'state/utils'
import {designPreviewSize} from 'config'

export default React.createClass({
  mixins: [reactor.ReactMixin, Router.State, Router.Navigation],

  getDataBindings() {
    return {existingDesign: Store.getters.currentDesign,
            layerImages: Store.getters.layerImages,
            colorPalettes: Store.getters.colorPalettes,
            surfaces: Store.getters.surfaces,
            tags: Store.getters.tags,
    }
  },

  getInitialState() {
    return {
      editingDesign: null,
      currentLayer: 0,
      errors: [],
      messages: [],
      width: 400,
      height: 400,
      designJpgUrl: null,
      showDeleteConfirmation: false,
      confirmDeleteText: '',
      selectedTag: null,
    }
  },

  componentWillMount() {
    setTimeout(() => {
      if ((!this.state.editingDesign || this.designIsNotHydrated()) && this.state.existingDesign &&
          this.getParams().designId === this.state.existingDesign.get('id')) {
        setTimeout(() => this.setState({editingDesign: this.state.existingDesign}), 200)
      } else {
        Store.actions.selectDesignId(this.props.params.designId)
        Store.actions.loadAdminCreateDesignData()
      }
    }, 50)
  },

  componentDidUpdate(prevProps, prevState) {
    if ((!this.state.editingDesign || this.designIsNotHydrated()) && this.state.existingDesign) {
      setTimeout(() => this.setState({editingDesign: this.state.existingDesign}), 200)
    }
  },

  clearMessages() {
    this.setState({messages: []})
  },

  selectSurface(surface) {
    this.setState({editingDesign: this.state.editingDesign.set('surface', surface)})
  },

  selectLayerImage(layerImage) {
    var layerIndex = this.state.currentLayer
    var editingDesign = this.state.editingDesign.updateIn(['layers', layerIndex],
                                l => l.set('selectedLayerImage', layerImage))
    this.setState({editingDesign: editingDesign})
  },

  selectColorPalette(palette) {
    var layerIndex = this.state.currentLayer
    var editingDesign = this.state.editingDesign.updateIn(['layers', layerIndex], l => l.set('colorPalette', palette))
    this.setState({editingDesign:editingDesign})
  },

  selectLayer(i) {
    this.setState({currentLayer: i})
  },

  handleRotateColorPalette() {
    var design = this.state.editingDesign
    var layer = design.getIn(['layers', this.state.currentLayer])
    this.setState({editingDesign: rotateColorPalette(design, layer)})
  },

  updateTitle(e) {
    this.setState({editingDesign: this.state.editingDesign.set('title', e.target.value)})
  },

  saveDesign(e) {
    e.preventDefault()
    var title = this.state.editingDesign.get('title')
    var surface = this.state.editingDesign.get('surface')
    var errors = []
    var messages = []
    if (!title || title.length === 0) {
      errors.push('You must set a title')
    }
    if (!surface) { errors.push('You must select a surface') }
    var layersValid = (
      this.state.editingDesign.get('layers')
      .map(l => l.has('colorPalette') && l.has('selectedLayerImage'))
      .every(v => v)
    )
    if (!layersValid) {
      errors.push('You must select a color palette and image for every layer.')
    }

    if (errors.length === 0) {
      let svgEls = document.querySelectorAll('.canvas .layer svg')
      Store.actions.updateDesign({design: this.state.editingDesign, svgEls: svgEls})
      messages.push('Design successfully saved.')
    }
    this.setState({errors: errors, messages: messages})
  },

  designIsNotHydrated() {
    var editingDesign = this.state.editingDesign
    return !(editingDesign &&
            editingDesign.get('layers').every(l => (
              typeof l === 'object' &&
              l.has('colorPalette') &&
              l.has('selectedLayerImage'))) &&
            (typeof editingDesign.get('surface') === 'object'))
  },

  handleShowDeleteConfirmation(){
    this.setState({showDeleteConfirmation: true})
  },

  onConfirmDeleteChange(e) {
    this.setState({confirmDeleteText: e.target.value})
  },

  confirmedDeleteDesign() {
    Store.actions.deleteDesign(this.state.existingDesign)
    this.transitionTo('adminDesigns')
  },

  _selectedLayer() {
    return this.state.editingDesign.getIn(['layers', this.state.currentLayer])
  },

  _selectedLayerTags() {
    return this._selectedLayer().get('tags') || Immutable.List()
  },

  onAddTagToSelectedLayer(tagToAdd) {
    Store.actions.addTagToLayer(tagToAdd, this._selectedLayer(), this.state.existingDesign)
  },

  onRemoveTag(tagToRemove) {
    Store.actions.removeTagFromLayer(tagToRemove, this._selectedLayer(), this.state.existingDesign)
  },

  render() {
    if (this.designIsNotHydrated()) { return null }

    var surfaces = this.state.surfaces.map(s => {
      var border = (this.state.editingDesign.get('surface').get('id') === s.get('id') ? '2px solid' : 'none')
      return <img src={imageUrlForSurface(s)}
                  onClick={this.selectSurface.bind(null, s)}
                  width={40} height={40} key={s.get('id')}
                  style={{border:border}}/>
    })

    var palettes = this.state.colorPalettes.map(p => {
      var bg = (this.state.editingDesign.getIn(['layers', this.state.currentLayer, 'colorPalette', 'id'])
               === p.get('id') ? 'yellow' : '#fff')
     return (
       <div style={{background:bg}}>
         <ColorPalette onClick={this.selectColorPalette.bind(null, p)}
                       palette={p}/>
       </div>
       )
    })

    var layerImages = this.state.layerImages.map(layerImage => {
      var bg = (this.state.editingDesign.getIn(['layers',this.state.currentLayer,
                  'selectedLayerImage', 'id']) === layerImage.get('id') ? 'yellow' : '#fff')
      return (
        <li onClick={this.selectLayerImage.bind(null, layerImage)}
            className="LayerImage"
            style={{background:bg, float:"left"}}>
          <img src={imageUrlForLayerImage(layerImage)}/>
        </li>
      )
    })

    var layers = (
      this.state.editingDesign.get('layers')
        .filter(l => l.has('colorPalette') &&
                     l.has('selectedLayerImage')))

    var errors = this.state.errors.map(e => {
      return <p style={{background:'#E85672'}}>{e}</p>
    })

    var messages = this.state.messages.map(m => {
      return <Notification message={m} onClose={this.clearMessages}/>
    })

    var height = this.state.height
    var width = this.state.width
    var selectLayers = [0,1,2].map(i => {
      return (
        <div style={{
          background:(this.state.currentLayer === i ? 'yellow' : '#fff'),
          border: '1px solid',
          display:'inline-block',
          padding: 10}}
          onClick={this.selectLayer.bind(null, i)}>Layer {i}</div>
        )
    })

    var tagOptions = this.state.tags.map(tag => {
      return (
        <option value={tag.get('id')}>{tag.get('name')}</option>
      )
    })
    var selectedTag = this.state.selectedTag ? this.state.selectedTag.get('id') : ''

    return (
      <div className="AdminEditDesign">
        {this.state.errors.length > 0 ? <div>{errors}</div> : null}
        {this.state.messages.length > 0 ? <div>{messages}</div> : null}
        <p>Edit Design:</p>

        {!this.state.showDeleteConfirmation ?
          <div><button onClick={this.handleShowDeleteConfirmation}>DELETE</button></div> : null}

        {this.state.showDeleteConfirmation ? (
          <div>
            <label>Enter 'yes' to confirm.</label>
            <input type="text" value={this.state.confirmDeleteText} onChange={this.onConfirmDeleteChange}/>
            {this.state.confirmDeleteText === 'yes' ?
                <button onClick={this.confirmedDeleteDesign}>REALLY DELETE</button> : null}
          </div>
          ) : null}

        <div style={{height:height, width:width, position:'relative', border: '1px solid'}}>
          <RenderLayers layers={layers} width={width} height={height} />
        </div>

        <label>Select layer to edit</label>
        <div style={{padding:20}}>
          {selectLayers}
        </div>

        <Tags selectedTags={this._selectedLayerTags()}
              onRemoveTag={this.onRemoveTag}
              onAddTag={this.onAddTagToSelectedLayer} />

        <form onSubmit={this.saveDesign}>
          <label>Title</label>
          <input type="text" value={this.state.editingDesign.get('title')} onChange={this.updateTitle}></input>
          <input type="submit"></input>
        </form>

        <p>Rotate palette</p>
        <ColorsButtonRotate
          layer={this.state.editingDesign.getIn(['layers', this.state.currentLayer])}
          onClick={this.handleRotateColorPalette}/>

        <section className='ChoosePalette'>
          {palettes}
        </section>

        <ul className="select-layer-image">
          {layerImages}
        </ul>

        {surfaces}

      </div>
    )
  }
})
