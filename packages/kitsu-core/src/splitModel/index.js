
/**
 * splitModel
 *
 * @param {String} url URL path for the model
 * @param {Object} options
 * @param {Function} options.resourceCase Convert libraryEntries to library-entries or library_entries (default no conversion). To use parameter, import kebab or snake from kitsu-core
 * @param {Function} options.pluralModel Pluralise models (default no pluralisation). To use parameter, import pluralize (or another pluralisation npm package)
 * @returns {Array} Array containing the model name and the resource URL with pluralisation applied
 *
 * @example
 * splitModel('posts/1/comments')
 * // [ 'comments', 'posts/1/comments' ]
 *
 * @example <caption>With pluralModel option</caption>
 * import plural from 'pluralize'
 * splitModel('posts/1/comment', { pluralModel: plural })
 * // [ 'comment', 'posts/1/comments' ]
 *
 * @example <caption>With resourceCase option</caption>
 * import { kebab, snake } from 'kitsu-core'
 * splitModel('libraryEntries', { resourceCase: kebab })
 * // [ 'libraryEntries', 'library-entries' ]
 *
 * splitModel('libraryEntries', { resourceCase: snake })
 * // [ 'libraryEntries', 'library_entries' ]
 */
export function splitModel (url, options = {}) {
  if (!options.pluralModel) options.pluralModel = s => s
  if (!options.resourceCase) options.resourceCase = s => s

  const urlSegments = url.split('/')
  const resourceModel = urlSegments.pop()
  urlSegments.push(options.pluralModel(options.resourceCase(resourceModel)))
  const newUrl = urlSegments.join('/')

  return [ resourceModel, newUrl ]
}
