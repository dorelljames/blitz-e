import { Context, Hono } from 'https://deno.land/x/hono@v3.11.7/mod.ts'

// Define the function name
const functionName = 'tasks'

interface Variables {}

const app = new Hono<{ Variables: Variables }>().basePath(`/${functionName}`)

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app
