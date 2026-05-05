import { describe, expect, it } from 'vitest'
import { buildSlugIndexes, neighborSlugs } from './neighbors'

const articles = [
  { slug: 'p1', title: 'А' },
  { slug: 'p2', title: 'Б' },
  { slug: 'p3', title: 'В' },
]

describe('neighborSlugs', () => {
  it('returns outgoing neighbors first, then incoming', () => {
    const { slugByTitle, titleBySlug } = buildSlugIndexes(articles)
    const edges = [
      { from: 'А', to: 'Б' },
      { from: 'В', to: 'А' },
    ]
    expect(neighborSlugs('p1', edges, slugByTitle, titleBySlug, 6)).toEqual([
      'p2',
      'p3',
    ])
  })

  it('respects maxNeighbors', () => {
    const { slugByTitle, titleBySlug } = buildSlugIndexes(articles)
    const edges = [
      { from: 'А', to: 'Б' },
      { from: 'А', to: 'В' },
    ]
    expect(neighborSlugs('p1', edges, slugByTitle, titleBySlug, 1)).toEqual([
      'p2',
    ])
  })
})
