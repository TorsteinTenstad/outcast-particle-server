import requests
import json


def main():
    get_url = 'http://localhost:8000/leaderboards/?userId=5'
    get_response = requests.get(get_url)
    result = get_response.text
    result = json.loads(result)
    print(json.dumps(result, indent=4, sort_keys=True))


if __name__ == "__main__":
    main()
