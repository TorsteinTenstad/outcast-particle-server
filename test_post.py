import requests
import json


def main():
    userId = 4
    score = 1000
    username = 'test_user'

    post_url = 'http://localhost:8000/username'
    post_headers = {'Content-Type': 'application/json'}
    post_data = {
        'userId': userId,
        'username': username,
    }

    requests.post(post_url, json=post_data, headers=post_headers)

    post_url = 'http://localhost:8000/score'
    post_headers = {'Content-Type': 'application/json'}
    post_data = {
        'userId': userId,
        'score': score,
        'level': 'Level 1',
        'coins': 3,
        'neutralWasUsed': False,
    }

    requests.post(post_url, json=post_data, headers=post_headers)


if __name__ == "__main__":
    main()
