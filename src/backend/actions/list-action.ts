import * as flat from 'flat'
import Action from './action.interface'
import sortSetter from '../services/sort-setter'
import Filter from '../utils/filter'
import populator from '../utils/populator'

const PER_PAGE_LIMIT = 500

/**
 * @typedef {Object} ApiController~ResourceResponse
 * @property {Array<BaseRecord~JSON>} records
 * @property {Object}                 meta
 * @property {Number}                 meta.page
 * @property {Number}                 meta.perPage
 * @property {String}                 meta.direction
 * @property {String}                 meta.sortBy
 * @property {Number}                 meta.total
 *
 */

/**
 * @implements Action
 * @category Actions
 * @module ListAction
 * @description
 * Retruns selected Records in a list
 */
const ListAction: Action = {
  name: 'list',
  isVisible: true,
  actionType: 'resource',
  showFilter: true,
  label: 'All records',
  /**
   * Responsible for returning data for all records.
   *
   * To invoke this action use {@link ApiClient#recordAction}
   *
   * @implements Action.handler
   * @return {ApiController~ResourceResponse} records with metadata
   */
  handler: async (request, response, data) => {
    const { query } = request
    const { sortBy, direction, filters = {} } = flat.unflatten(query || {})
    const { resource } = data
    let { page, perPage } = flat.unflatten(query || {})

    const listProperties = resource.decorate().getListProperties()

    if (perPage) {
      perPage = +perPage > PER_PAGE_LIMIT ? PER_PAGE_LIMIT : +perPage
    } else {
      perPage = 10 // default
    }
    page = Number(page) || 1
    const sort = sortSetter(
      { sortBy, direction },
      listProperties[0].name(),
      resource.decorate().options,
    )

    const filter = await new Filter(filters, resource).populate()

    const records = await resource.find(filter, {
      limit: perPage,
      offset: (page - 1) * perPage,
      sort,
    })
    const populatedRecords = await populator(records, listProperties)

    const total = await resource.count(filter)
    return {
      meta: {
        total,
        perPage,
        page,
        direction: sort.direction,
        sortBy: sort.sortBy,
      },
      records: populatedRecords,
    }
  },
}

export default ListAction