# YouTube Comments Downloader - Python CLI

Command-line tool for downloading YouTube comments.

## Requirements

```bash
pip install youtube-comment-downloader
```

## Usage

```bash
python yt_comments_downloader.py <youtube_url_or_video_id>
```

Output is saved to `../videos/yt_<video_id>.csv`

## Configuration

Edit `MIN_LIKES_THRESHOLD` in the script to filter comments by minimum likes (default: 0).

## Example

```bash
python yt_comments_downloader.py https://www.youtube.com/watch?v=dQw4w9WgXcQ
python yt_comments_downloader.py dQw4w9WgXcQ
```
