import { test, expect } from "bun:test"
import { extractVideoId, commentsToCSV } from "./youtube.ts"
import type { Comment } from "./youtube.ts"

test("extractVideoId handles direct video ID", () => {
  expect(extractVideoId("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ")
})

test("extractVideoId handles standard watch URL", () => {
  expect(extractVideoId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe(
    "dQw4w9WgXcQ"
  )
})

test("extractVideoId handles short URL", () => {
  expect(extractVideoId("https://youtu.be/dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ")
})

test("extractVideoId handles embed URL", () => {
  expect(extractVideoId("https://youtube.com/embed/dQw4w9WgXcQ")).toBe(
    "dQw4w9WgXcQ"
  )
})

test("extractVideoId handles shorts URL", () => {
  expect(extractVideoId("https://youtube.com/shorts/dQw4w9WgXcQ")).toBe(
    "dQw4w9WgXcQ"
  )
})

test("extractVideoId returns null for invalid input", () => {
  expect(extractVideoId("not-a-url")).toBe(null)
  expect(extractVideoId("https://example.com")).toBe(null)
})

test("commentsToCSV generates valid CSV", () => {
  const comments: Comment[] = [
    {
      cid: "abc123",
      text: "Great video!",
      author: "User1",
      votes: 100,
      time: "1 day ago",
    },
    {
      cid: "def456",
      text: 'Test "quotes"',
      author: "User2",
      votes: 50,
      time: "2 days ago",
      parent: "abc123",
    },
  ]

  const csv = commentsToCSV(comments)
  const lines = csv.split("\n")

  expect(lines[0]).toBe("published_time,author,likes,comment_id,parent_id,comment")
  expect(lines[1]).toBe('"1 day ago","User1",100,"abc123","","Great video!"')
  expect(lines[2]).toBe('"2 days ago","User2",50,"def456","abc123","Test ""quotes"""')
})
