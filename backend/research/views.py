from django.shortcuts import render
from django.http import HttpResponse, JsonResponse

import re
import requests
import asyncio
import itertools
import pandas as pd
from bs4 import BeautifulSoup
from scholarly import scholarly

from research.utils import make_requests, try_map, clean_category, generate_payloads
from research.serializers import ResearchArchiveSerializer
from research.models import ResearchArchive

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import JSONParser
import os
from dotenv import load_dotenv
load_dotenv()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_articles(request):
    if request.method == "GET":
        search_query = request.query_params.get('search_query', "")
        category = request.query_params.get('category', "")
        page = request.query_params.get('page', "")
        start_year = request.query_params.get("start_year", "")
        end_year = request.query_params.get("end_year", "")
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        payloads = generate_payloads(
            num_articles=page, search_query=search_query, category=category, start=start_year, end=end_year)
        async_result = loop.run_until_complete(
            make_requests(payloads=payloads))
        loop.close()
        try:
            cleaned_results = itertools.chain.from_iterable(
                list(map(lambda x: eval(x)['items'], async_result)))
            cleaned_results = pd.DataFrame(list(map(lambda x: [try_map(x, 'title'), try_map(x, 'publicationYear'), try_map(
                x, 'isPartOf'), try_map(x, 'url'), try_map(x, 'tdmCategory')], cleaned_results)), columns=['title', 'publication_year', 'publication_house', 'url', 'categories'])
            cleaned_results.categories = cleaned_results.categories.apply(
                lambda x: clean_category(x))
            cleaned_results = cleaned_results.T.to_json()
            return HttpResponse(cleaned_results)
        except Exception as e:
            return HttpResponse(e)


@api_view(['GET', 'POST', 'DELETE'])
@permission_classes([IsAuthenticated])
def retrieve_research_archive(request):

    if request.method == 'GET':
        user_id = request.GET.get("UserID")
        # Allows retrieval of either all items or only one item
        researcharchive = ResearchArchive.objects.filter(
            UserID__contains=user_id)
        researcharchive_serializer = ResearchArchiveSerializer(
            researcharchive, many=True)
        return JsonResponse(researcharchive_serializer.data, safe=False)

    elif request.method == 'POST':
        research_postdata = JSONParser().parse(request)
        research_postdata['PubYear'] = int(research_postdata['PubYear'])
        research_postdata['UserID'] = str(research_postdata['UserID'])
        research_postdata['Category'] = str(research_postdata['Category'])

        researcharchive_serializer = ResearchArchiveSerializer(
            data=research_postdata)
        if researcharchive_serializer.is_valid():
            researcharchive_serializer.save()
            return JsonResponse(researcharchive_serializer.data, status=status.HTTP_201_CREATED)
        else:
            print(researcharchive_serializer.errors)
            return JsonResponse(researcharchive_serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        params = JSONParser().parse(request)
        try:
            title_id = params['TitleID']
        except:
            title_id = None
        user_id = str(params["UserID"])
        if not title_id:
            count = ResearchArchive.objects.all().delete()
        else:
            count = ResearchArchive.objects.filter(
                TitleID=title_id).filter(UserID=user_id).delete()
        return JsonResponse({'message': f'{count} Entries were deleted successfully!'}, status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_libgen_download_link(request):

    try:
        query = request.GET.get("query")
        res = requests.get(f"http://libgen.lc/index.php?req={query}").text

        link = BeautifulSoup(res).find_all("tbody")[0].find_all("tr")[
            0].select("a[href*=libgen]")

        download_link = list(
            map(lambda x: re.findall('href="(.*?)"', str(x))[0], link))
        download_link = [i for i in BeautifulSoup(requests.get(
            download_link[0]).text).find_all("a") if "GET" in str(i)]
        download_link = re.findall('href="(.*?)"', str(download_link[0]))[0]
        return HttpResponse("http://80.82.78.35/" + download_link.replace("&amp;", "&"))

    except Exception as e:
        return HttpResponse("")


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_gscholar_info(request):

    try:
        query = request.GET.get("query")
        res = next(scholarly.search_pubs(query))
        try:
            abstract = res['bib']['abstract']
        except:
            abstract = None
        try:
            author = res['bib']['author']
        except:
            author = None
        try:
            citations = res['num_citations']
        except:
            citations = None

        if abstract == None and author == None and citations == None:
            return JsonResponse()
        else:
            return JsonResponse({'abstract': abstract, 'author': author, 'citations': citations})

    except:
        return JsonResponse()


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_gscholar_citation(request):
    try:
        query = request.GET.get("query")
        # Part 1: Obtain ID of Search
        query_url = "https://scholar.google.com/scholar?hl=en&as_sdt=0%2C5&q=" + query + "&oq="
        payload = {}
        headers = {
            'Cookie': os.environ['GSCHOLAR_COOKIE']
        }
        response = requests.request(
            "GET", query_url, headers=headers, data=payload)
        html_soup = BeautifulSoup(response.text, 'lxml')
        id_tag_1 = html_soup.find_all(id='gs_res_ccl_mid')[0]
        id_tag_2 = id_tag_1.find(class_="gs_r gs_or gs_scl")
        id = id_tag_2["data-aid"]

        # Part 2: Scrape Results
        results_url = "https://scholar.google.com/scholar?q=info:" + \
            id + ":scholar.google.com/&output=cite&scirp=0&hl=en"

        payload = {}

        response = requests.request(
            "GET", results_url, headers=headers, data=payload)
        html_soup = BeautifulSoup(response.text, 'lxml')
        table_tag = html_soup.find_all("table")
        citationResults = {}
        for div in table_tag[0]:
            method = div.find(class_="gs_cith").text
            result = div.find(class_="gs_citr").text
            citationResults[method] = result
        return JsonResponse(citationResults)
    except:
        return JsonResponse({"status": "fail"}, status=403)
