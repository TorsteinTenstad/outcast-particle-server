import requests
import json


def main():
    post_url = 'http://localhost:8000/score'
    post_data = {
        'username': 'paasen',
        'score': 1001,
        'level': 'Level 1',
        'coins': 3,
        'neutralWasUsed': False,
    }
    post_headers = {'Content-Type': 'application/json'}

    requests.post(post_url, json=post_data, headers=post_headers)

    post_url = 'http://localhost:8000/score'

    # GET request
    get_url = 'http://localhost:8000/score/?username=magne&level=Level%201&coins=3&neutralWasUsed=False'
    get_response = requests.get(get_url)
    result = get_response.text
    print(result)

    get_url = 'http://localhost:8000/leaderboards/?username=simen'
    get_response = requests.get(get_url)
    result = get_response.text
    print(result)
    result = json.loads(result)
    print(json.dumps(result, indent=4, sort_keys=True))


if __name__ == "__main__":
    main()
