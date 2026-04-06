import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'PHPolygon',
  description: 'PHP-native Game Engine with AI-first authoring',
  lang: 'en-US',

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api/facades' },
      { text: 'GitHub', link: 'https://github.com/phpolygon/phpolygon' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'What is PHPolygon?', link: '/guide/what-is-phpolygon' },
            { text: 'Getting Started', link: '/guide/getting-started' },
          ],
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'ECS Architecture', link: '/guide/ecs' },
            { text: 'Scenes', link: '/guide/scenes' },
            { text: 'Rendering', link: '/guide/rendering' },
            { text: 'Shaders', link: '/guide/shaders' },
            { text: 'Procedural Geometry', link: '/guide/geometry' },
            { text: 'UI System', link: '/guide/ui' },
          ],
        },
        {
          text: 'Tools',
          items: [
            { text: 'Editor', link: '/guide/editor' },
            { text: 'Building & Distribution', link: '/guide/building' },
            { text: 'Headless & Testing', link: '/guide/testing' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Facades', link: '/api/facades' },
            { text: 'Components', link: '/api/components' },
            { text: 'Systems', link: '/api/systems' },
            { text: 'Render Commands', link: '/api/render-commands' },
            { text: 'Shader API', link: '/api/shaders' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/phpolygon/phpolygon' },
    ],

    search: {
      provider: 'local',
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2025-present PHPolygon',
    },

    editLink: {
      pattern: 'https://github.com/phpolygon/phpolygon.github.io/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
  },
})
