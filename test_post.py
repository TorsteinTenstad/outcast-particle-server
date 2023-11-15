import requests
import json


def main():
    userIds = [526, 1302, 1169, 6782649284, 93610573901, 8402850274945]
    for userId in userIds:
        post_url = 'http://volatile-particle.deno.dev/username'
        post_headers = {'Content-Type': 'application/json'}
        post_data = {
            'userId': userId,
            'password': "iknowwhatimdoingtrustme",
        }

        requests.delete(post_url, json=post_data, headers=post_headers)

    for userID, level, coins, neutralWasUsed in [
    ]:
        post_url = 'http://volatile-particle.deno.dev/score'
        post_headers = {'Content-Type': 'application/json'}
        post_data = {
            'userId': userId,
            'level': level,
            'coins': coins,
            'neutralWasUsed': neutralWasUsed,
            'password': "iknowwhatimdoingtrustme",
        }

        requests.delete(post_url, json=post_data, headers=post_headers)


if __name__ == "__main__":
    main()
