/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                surface: {
                    1: '#000000',
                    2: '#0a0a0a',
                    3: '#1a1a1a',
                }
            }
        },
    },
    plugins: [],
}
