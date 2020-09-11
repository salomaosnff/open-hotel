import * as PIXI from 'pixi.js'
import { Loader } from '../../engine/loader'
import { ApplicationProvider } from '../pixi/application.provider'
import { Provider } from 'injets/dist'
import { Application } from '../../engine/Application'
import { SetType, HumanFigureProps } from './human/humanImagerTypes'
import { RenderTree } from './human/renderTree'
import { HumanFigure } from './human/figure.util'

@Provider()
export class HumanImager {
  readonly app: Application

  constructor(private readonly loader: Loader, appProvider: ApplicationProvider) {
    this.app = appProvider.app
  }

  private getData(name: string) {
    return this.loader.resources[name].json
  }

  get figuremap() {
    return this.getData('figuremap')
  }

  get figuredata() {
    return this.getData('figuredata')
  }

  get partsets() {
    return this.getData('partsets')
  }

  get avatarActions(): { state; precedence } {
    return this.getData('avatarActions')
  }

  get geometry() {
    return this.getData('geometry')
  }

  get animations() {
    return this.getData('animations')
  }

  get effectmap() {
    return this.getData('effectmap')
  }

  private _actionTypeToAnimationName
  get actionTypeToAnimationName() {
    if (this._actionTypeToAnimationName) {
      return this._actionTypeToAnimationName
    }
    return this._actionTypeToAnimationName = Object.entries(this.avatarActions).reduce(
      (acc, [name, { state }]) => ({
        ...acc,
        [state]: name,
      }),
      {},
    )
  }

  private async loadDependencies(setTypes: SetType[]) {
    const dependencies = setTypes.flatMap<string>(({ set }) => {
      const setDependecies = set.parts.map(part => {
        const lib = HumanFigure.getLib(this.figuremap, part.type, part.id)
        return lib && `${lib}/${lib}.json`
      })
      return Array.from(new Set(setDependecies))
    }).filter(e => e)

    await this.loader.add(dependencies).wait()
  }

  async createAnimation(options: HumanFigureProps) {
    const setTypes: SetType[] = Object.entries(options.figure)
      .map(
        ([typeName, partOptions]) => {
          const settype = this.figuredata.settype[typeName]
          const colors: number[] = partOptions.colors.map(
            colorId => Number('0x' + this.figuredata.palette[settype.paletteid][colorId].color)
          )
          return {
            set: this.figuredata.settype[typeName].set[partOptions.id],
            settype,
            colors,
            typeName
          }
        }
      )

    await this.loadDependencies(setTypes)

    const actions = this.getActions(options)
    const renderTree = new RenderTree(this.loader, actions).build(setTypes, options)
    const container = renderTree.createContainer(options)

    return {
      container,
      renderTree
    }
  }

  private getActions(props: HumanFigureProps) {
    let actions = Object.keys(props.actions)
      .map(a => this.avatarActions[this.actionTypeToAnimationName[a]])
      .filter(a => a)
      .sort((a, b) => b.precedence - a.precedence)

    actions.forEach(action => {
      const prevents = new Set((action.prevents || '').split(','))
      if (prevents.size > 0) {
        actions = actions.filter(a => {
          if (a.state === 'fx') {
            return !prevents.has([a.state, props.actions.fx].join('.'))
          }
          return !prevents.has(a.state)
        })
      }
    })

    return actions
  }

}
