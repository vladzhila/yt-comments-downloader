#!/usr/bin/env python3
"""
YouTube Comments Downloader
Downloads all comments and replies from a YouTube video and saves them to a CSV file.
"""

import sys
import re
import os
import csv
from datetime import datetime
from pathlib import Path
from youtube_comment_downloader import YoutubeCommentDownloader

# Minimum likes threshold for including comments
MIN_LIKES_THRESHOLD = 0


def extract_video_id(url_or_id):
    """Extract video ID from YouTube URL or return the ID if already provided."""
    if len(url_or_id) == 11 and not '/' in url_or_id:
        return url_or_id

    patterns = [
        r'(?:youtube\.com/watch\\?v\\?=|youtu\.be/)([a-zA-Z0-9_-]{11})',
        r'(?:youtube\.com/watch\?v=|youtu\.be/)([a-zA-Z0-9_-]{11})',
        r'youtube\.com/embed/([a-zA-Z0-9_-]{11})',
        r'youtube\.com/v/([a-zA-Z0-9_-]{11})',
    ]

    for pattern in patterns:
        match = re.search(pattern, url_or_id)
        if match:
            return match.group(1)

    raise ValueError(f"Could not extract video ID from: {url_or_id}")


def format_comment(comment):
    """Format a comment into the required string format."""
    if isinstance(comment, str):
        clean_text = comment.replace('\n', ' ').replace('\r', ' ')
        return f"Unknown | Unknown | 0 | Unknown | {clean_text}"

    published_time = comment.get('time', 'Unknown')
    author = comment.get('author', 'Unknown')
    likes = comment.get('votes', 0)
    comment_id = comment.get('cid', 'Unknown')
    text = comment.get('text', '').replace('\n', ' ').replace('\r', ' ')

    parent_id = comment.get('parent')
    parent_info = f" [{parent_id}]" if parent_id else ""

    return f"{published_time} | {author} | {likes} | {comment_id}{parent_info} | {text}"


def download_comments(video_id):
    """Download all comments and replies for a YouTube video."""
    downloader = YoutubeCommentDownloader()

    print(f"Downloading comments for video ID: {video_id}")

    all_comments = []
    processed_count = 0

    try:
        comments = downloader.get_comments_from_url(f'https://www.youtube.com/watch?v={video_id}')

        for comment in comments:
            processed_count += 1
            if processed_count % 50 == 0:
                print(f"Processed {processed_count} comments, found {len(all_comments)} with {MIN_LIKES_THRESHOLD}+ likes...")

            if isinstance(comment, str):
                continue

            likes = comment.get('votes', 0)
            try:
                likes_int = int(likes) if likes else 0
            except (ValueError, TypeError):
                likes_int = 0

            if likes_int >= MIN_LIKES_THRESHOLD:
                all_comments.append(comment)

            if 'replies' in comment and isinstance(comment['replies'], list):
                for reply in comment['replies']:
                    if isinstance(reply, str):
                        continue

                    reply_likes = reply.get('votes', 0)
                    try:
                        reply_likes_int = int(reply_likes) if reply_likes else 0
                    except (ValueError, TypeError):
                        reply_likes_int = 0

                    if reply_likes_int >= MIN_LIKES_THRESHOLD:
                        all_comments.append(reply)

    except Exception as e:
        print(f"Error downloading comments: {e}")
        return []

    print(f"Downloaded {len(all_comments)} comments and replies with {MIN_LIKES_THRESHOLD}+ likes")
    return all_comments


def sort_comments_by_likes(comments):
    """Sort comments by number of likes (most liked first)."""
    def get_likes(comment):
        if isinstance(comment, str):
            return 0
        likes = comment.get('votes', 0)
        return int(likes) if isinstance(likes, (int, str)) and str(likes).isdigit() else 0

    return sorted(comments, key=get_likes, reverse=True)


def save_comments_to_file(comments, video_id):
    """Save comments to a CSV file."""
    videos_dir = Path.cwd() / "videos"
    videos_dir.mkdir(exist_ok=True)
    filename = f"yt_{video_id}.csv"
    filepath = videos_dir / filename

    try:
        with open(filepath, 'w', encoding='utf-8', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['published_time', 'author', 'likes', 'comment_id', 'parent_id', 'comment'])

            for comment in comments:
                if isinstance(comment, str):
                    writer.writerow(['Unknown', 'Unknown', 0, 'Unknown', '', comment])
                else:
                    published_time = comment.get('time', 'Unknown')
                    author = comment.get('author', 'Unknown')
                    likes = comment.get('votes', 0)
                    comment_id = comment.get('cid', 'Unknown')
                    parent_id = comment.get('parent', '')
                    text = comment.get('text', '')
                    writer.writerow([published_time, author, likes, comment_id, parent_id, text])

        return filepath.absolute()

    except Exception as e:
        print(f"Error saving file: {e}")
        return None


def main():
    """Main function to run the YouTube comments downloader."""
    if len(sys.argv) != 2:
        print("Usage: python yt_comments_downloader.py <youtube_url_or_video_id>")
        sys.exit(1)

    url_or_id = sys.argv[1]

    try:
        video_id = extract_video_id(url_or_id)
        comments = download_comments(video_id)

        if not comments:
            print("No comments found or failed to download comments.")
            sys.exit(1)

        sorted_comments = sort_comments_by_likes(comments)
        saved_path = save_comments_to_file(sorted_comments, video_id)

        if saved_path:
            print(f"Comments saved to: {saved_path}")
        else:
            print("Failed to save comments to file.")
            sys.exit(1)

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
