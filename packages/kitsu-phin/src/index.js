import phin from 'phin'
import pluralise from 'pluralize'
import { camel, deserialise, error, kebab, query, serialise, snake, splitModel } from 'kitsu-core'

/**
 * Creates a new `kitsu` instance
 *
 * @param {Object} [options] Options
 * @param {string} [options.baseURL=https://kitsu.io/api/edge] Set the API endpoint
 * @param {Object} [options.headers] Additional headers to send with the requests
 * @param {boolean} [options.camelCaseTypes=true] If enabled, `type` will be converted to camelCase from kebab-casae or snake_case
 * @param {'kebab'|'snake'|'none'} [options.resourceCase=kebab] Case to convert camelCase to. `kebab` - `/library-entries`; `snake` - /library_entries`; `none` - `/libraryEntries`
 * @param {boolean} [options.pluralize=true] If enabled, `/user` will become `/users` in the URL request and `type` will be pluralized in POST, PATCH and DELETE requests
 * @param {Object} [options.phinOptions] Additional options for Phin (see [phin docs](https://ethanent.github.io/phin/global.html#phinOptions) for details)
 */
export default class Kitsu {
  constructor (options = {}) {
    if (options.camelCaseTypes === false) this.camel = s => s
    else this.camel = camel

    if (options.resourceCase === 'none') this.resCase = s => s
    else if (options.resourceCase === 'snake') this.resCase = snake
    else this.resCase = kebab

    /**
     * If pluralization is enabled (default, see Kitsu constructor docs) then pluralization rules can be added
     *
     * @memberof Kitsu
     * @external plural
     * @see {@link https://www.npmjs.com/package/pluralize} for documentation
     * @see {@link Kitsu} constructor options for disabling pluralization
     */
    if (options.pluralize === false) this.plural = s => s
    else this.plural = pluralise

    /**
     * Get the current headers or add additional headers
     *
     * @memberof Kitsu
     * @returns {Object} All the current headers
     */
    this.headers = Object.assign({}, options.headers, { Accept: 'application/vnd.api+json', 'Content-Type': 'application/vnd.api+json' })

    this.phin = phin(
      Object.assign({}, {
        parse: 'json',
        compression: true
      }, options.phinOptions)
    )

    this.baseURL = options.baseURL || 'https://kitsu.io/api/edge'
    this.fetch = this.get
    this.update = this.patch
    this.create = this.post
    this.remove = this.delete
  }

  /**
   * Fetch resources (alias `fetch`)
   *
   * @memberof Kitsu
   * @param {string} model Model to fetch data from
   * @param {Object} [params] JSON-API request queries. Any JSON:API query parameter not mentioned below is supported out of the box.
   * @param {Object} [params.page] [JSON:API Pagination](http://jsonapi.org/format/#fetching-pagination). All pagination strategies are supported, even if they are not listed below.
   * @param {number} [params.page.limit] Number of resources to return in request (Offset-based) - **Note:** For Kitsu.io, max is `20` except on `libraryEntries` which has a max of `500`
   * @param {number} [params.page.offset] Number of resources to offset the dataset by (Offset-based)
   * @param {number} [params.page.number] Page of resources to return in request (Page-based) - **Note:** Not supported on Kitsu.io
   * @param {number} [params.page.size] Number of resources to return in request (Page-based and cursor-based) - **Note:** Not supported on Kitsu.io
   * @param {string} [params.page.before] Get the previous page of resources (Cursor-based) - **Note:** Not Supported on Kitsu.io
   * @param {string} [params.page.after] Get the next page of resources (Cursor-based) - **Note:** Not Supported on Kitsu.io
   * @param {Object} [params.fields] Return a sparse fieldset with only the included attributes/relationships - [JSON:API Sparse Fieldsets](http://jsonapi.org/format/#fetching-sparse-fieldsets)
   * @param {Object} [params.filter] Filter dataset by attribute values - [JSON:API Filtering](http://jsonapi.org/format/#fetching-filtering)
   * @param {string} [params.sort] Sort dataset by one or more comma separated attributes (prepend `-` for descending order) - [JSON:API Sorting](http://jsonapi.org/format/#fetching-sorting)
   * @param {string} [params.include] Include relationship data - [JSON:API Includes](http://jsonapi.org/format/#fetching-includes)
   * @param {Object} [headers] Additional headers to send with the request
   * @returns {Object} JSON-parsed response
   */
  async get (model, params = {}, headers = {}) {
    try {
      const [ res, id, relationship ] = model.split('/')

      let url = this.plural(this.resCase(res))
      if (id) url += `/${id}`
      if (relationship) url += `/${this.resCase(relationship)}`

      const { data } = await this.phin({
        url: `${this.baseURL}/${url}${query(params)}`,
        method: 'GET',
        headers: Object.assign(this.headers, headers)
      })

      return deserialise(data)
    } catch (E) {
      throw error(E)
    }
  }

  /**
   * Update a resource (alias `update`)
   *
   * @memberof Kitsu
   * @param {string} model Model to update data in
   * @param {Object|Object[]} body Data to send in the request
   * @param {Object} [headers] Additional headers to send with the request
   * @returns {Object|Object[]} JSON-parsed response
   */
  async patch (model, body, headers = {}) {
    try {
      const [ resourceModel, url ] = splitModel(model, {
        resourceCase: this.resCase,
        pluralModel: this.plural
      })
      const serialData = serialise(resourceModel, body, 'PATCH', {
        camelCaseTypes: this.camel,
        pluralTypes: this.plural
      })
      const { data } = await this.phin({
        url: `${this.baseURL}/${url}/${body.id}`,
        method: 'PATCH',
        headers: Object.assign(this.headers, headers),
        data: serialData
      })

      return deserialise(data)
    } catch (E) {
      throw error(E)
    }
  }

  /**
   * Create a new resource (alias `create`)
   *
   * @memberof Kitsu
   * @param {string} model Model to create a resource under
   * @param {Object|Object[]} body Data to send in the request
   * @param {Object} [headers] Additional headers to send with the request
   * @returns {Object|Object[]} JSON-parsed response
   */
  async post (model, body, headers = {}) {
    try {
      const [ resourceModel, url ] = splitModel(model, {
        resourceCase: this.resCase,
        pluralModel: this.plural
      })
      const { data } = await this.phin({
        url: `${this.baseURL}/${url}`,
        method: 'POST',
        headers: Object.assign(this.headers, headers),
        data: serialise(resourceModel, body, 'POST', {
          camelCaseTypes: this.camel,
          pluralTypes: this.plural
        })
      })

      return deserialise(data)
    } catch (E) {
      throw error(E)
    }
  }

  /**
   * Remove a resource (alias `remove`)
   *
   * @memberof Kitsu
   * @param {string} model Model to remove data from
   * @param {string|number|number[]} id Resource ID to remove. Pass an array of IDs to delete multiple resources (Bulk Extension)
   * @param {Object} [headers] Additional headers to send with the request
   * @returns {Object|Object[]} JSON-parsed response
   */
  async delete (model, id, headers = {}) {
    try {
      const [ resourceModel, url ] = splitModel(model, {
        resourceCase: this.resCase,
        pluralModel: this.plural
      })
      const isBulk = Array.isArray(id)
      let path, payload

      if (isBulk) {
        path = url
        payload = id.map(id => ({ id }))
      } else {
        path = `${url}/${id}`
        payload = { id }
      }

      const { data } = await this.phin({
        url: `${this.baseURL}/${path}`,
        method: 'DELETE',
        headers: Object.assign(this.headers, headers),
        data: serialise(resourceModel, payload, 'DELETE', {
          camelCaseTypes: this.camel,
          pluralTypes: this.plural
        })
      })

      return data
    } catch (E) {
      throw error(E)
    }
  }

  /**
   * Get the authenticated user's data
   *
   * **Note** Requires the JSON:API server to support `filter[self]=true`
   *
   * @memberof Kitsu
   * @param {Object} [params] JSON-API request queries
   * @param {Object} [params.fields] Return a sparse fieldset with only the included attributes/relationships - [JSON:API Sparse Fieldsets](http://jsonapi.org/format/#fetching-sparse-fieldsets)
   * @param {string} [params.include] Include relationship data - [JSON:API Includes](http://jsonapi.org/format/#fetching-includes)
   * @param {Object} [headers] Additional headers to send with the request
   * @returns {Object} JSON-parsed response
   */
  async self (params = {}, headers = {}) {
    try {
      const res = await this.get('users', Object.assign({ filter: { self: true } }, params), headers)
      return res.data[0]
    } catch (E) {
      throw error(E)
    }
  }

  /**
   * Send arbitrary requests
   *
   * **Note** Planned changes to the `get`, `patch`, `post` and `delete` methods in a future major release may make this method redundent. See https://github.com/wopian/kitsu/issues/415 for details.
   *
   * @memberof Kitsu
   * @param {Object} [config] Request configuration
   * @param {string} config.url The URL path of the resource
   * @param {string} config.type The resource type
   * @param {Object|Object[]} [config.body] Data to send in the request
   * @param {string} [config.method] Request method - `GET`, `PATCH`, `POST` or `DELETE` (defaults to `GET`, case-insensitive)
   * @param {Object} [config.params] JSON-API request queries. Any JSON:API query parameter not mentioned below is supported out of the box.
   * @param {Object} [config.params.page] [JSON:API Pagination](http://jsonapi.org/format/#fetching-pagination). All pagination strategies are supported, even if they are not listed below.
   * @param {number} [config.params.page.limit] Number of resources to return in request (Offset-based) - **Note:** For Kitsu.io, max is `20` except on `libraryEntries` which has a max of `500`
   * @param {number} [config.params.page.offset] Number of resources to offset the dataset by (Offset-based)
   * @param {number} [config.params.page.number] Page of resources to return in request (Page-based) - **Note:** Not supported on Kitsu.io
   * @param {number} [config.params.page.size] Number of resources to return in request (Page-based and cursor-based) - **Note:** Not supported on Kitsu.io
   * @param {string} [config.params.page.before] Get the previous page of resources (Cursor-based) - **Note:** Not Supported on Kitsu.io
   * @param {string} [config.params.page.after] Get the next page of resources (Cursor-based) - **Note:** Not Supported on Kitsu.io
   * @param {Object} [headers] Additional headers to send with the request
   * @returns {Object} JSON-parsed response
   */
  async request ({ body, method, params, type, url }, headers = {}) {
    try {
      method = method?.toUpperCase() || 'GET'
      const { data } = await this.phin({
        url: `${this.baseURL}/${url}${query(params)}`,
        method,
        headers: Object.assign(this.headers, headers),
        data: [ 'GET', 'DELETE' ].includes(method) ? undefined : serialise(type, body, method, {
          camelCaseTypes: this.camel,
          pluralTypes: this.plural
        })
      })

      return deserialise(data)
    } catch (E) {
      throw error(E)
    }
  }
}
