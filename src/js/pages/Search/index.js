/* globals API_URL, GURBANIBOT_URL */
import React from 'react';
import PropTypes from 'prop-types';
import { buildApiUrl } from '@sttm/banidb';
import { SEARCH_TYPES, TEXTS } from '../../constants';
import PageLoader from '../PageLoader';
import GenericError, { SachKaur } from '../../components/GenericError';
import Layout, { Stub } from './Layout';
import { parseSemanticData } from './utils';

export default class Search extends React.PureComponent {
  static defaultProps = {
    offset: 0,
  };

  static propTypes = {
    q: PropTypes.string.isRequired,
    type: PropTypes.number,
    source: PropTypes.string,
    offset: PropTypes.number,
    writer: PropTypes.string,
  };

  constructor() {
    super();
    this.state = {
      searchURL: '',
    };
    this.verseIdList = [];
    this.semanticInfo = {};
  }

  setSearchUrl() {
    const { q, type } = this.props;
    const isChatBot = type === SEARCH_TYPES.ASK_A_QUESTION;

    if (isChatBot) {
      const semanticApi = encodeURI(`${GURBANIBOT_URL}search/?query=${q}`);
      try {
        const semanticReq = fetch(semanticApi).then((response) => response.json());
        semanticReq.then((semanticData) => {
          const shabadIdList = semanticData.results.map((dataObj) => {
            const { ShabadID, VerseID } = dataObj.Payload;
            this.verseIdList.push(VerseID);
            return ShabadID;
          });

          this.semanticInfo = {
            pageResults: shabadIdList.length,
            TotalResults: shabadIdList.length,
            pages: {
              page: 1,
              resultsPerPage: 20,
              totalPages: 1
            }
          }
          this.setState({ searchURL: `${API_URL}shabads/${shabadIdList.toString()}` });
        });
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('err.message', err.message);
      }
    }
  }

  componentDidMount() {
    this.setSearchUrl();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.q !== this.props.q ||
      prevState.searchURL != this.state.searchURL) {
      this.setSearchUrl();
    }
  }

  render() {
    const { q, type, source, offset, writer } = this.props;
    const isChatBot = type === SEARCH_TYPES.ASK_A_QUESTION;
    const url = isChatBot ? this.state.searchURL : encodeURI(
      buildApiUrl({ q, type, source, offset, writer, API_URL })
    );

    if (q === '') {
      return (
        <GenericError
          title={TEXTS.EMPTY_QUERY}
          description={TEXTS.EMPTY_QUERY_DESCRIPTION}
          image={SachKaur}
        />
      );
    }

    return (
      <PageLoader url={url}>
        {({ loading, data }) => {
          if (loading || data === undefined) return <Stub />;
          let parsedData = {};
          if (isChatBot) {
            parsedData = parseSemanticData(data, this.verseIdList);
            parsedData.resultsInfo = this.semanticInfo;
          } else {
            parsedData = data;
          }

          const { resultsInfo, verses } = parsedData;

          return (
            <Layout
              pages={Array.from(
                Array(parseInt(resultsInfo.pages.totalPages)),
                (_, i) => i + 1
              )}
              totalResults={resultsInfo.totalResults || 0}
              resultsCount={resultsInfo.pageResults || 0}
              offset={offset}
              //nextPageOffset={resultsInfo.pages.page}
              shabads={verses}
              q={q}
              type={type}
              source={source}
              writer={writer}
            />
          );
        }}
      </PageLoader>
    );
  }
}
